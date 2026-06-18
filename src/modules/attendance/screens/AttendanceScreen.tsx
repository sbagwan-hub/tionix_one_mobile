import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  Alert,
  Platform,
  Animated,
  RefreshControl,
  Modal,
  TextInput,
  Image,
} from 'react-native';
import Shimmer from '../../../components/Shimmer';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Circle, Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { getDistance } from 'geolib';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import AppCard from '../../../components/AppCard';
import PremiumNotificationBell from '../../../components/PremiumNotificationBell';
import { showLocationAlert } from '../hooks/useOfficeDistance';
import { useLiveLocation } from '../context/LiveLocationContext';
import { verifyAttendanceBiometric } from '../../../services/biometrics';
import {
  punchIn,
  punchOut,
  punchBreak,
  punchResume,
  postLiveLocation,
  getAttendanceStatus,
  getAttendanceConfig,
  getAttendanceHistory,
  AttendanceHistoryDay,
  getGeolocations,
} from '../services/attendance';
import { getAuthSession } from '../../auth/services/auth';
import { getEmployeeProfile } from '../../profile/services/profile';
import { COMPANY } from '../../../config/company';

type RecentLog = {
  id: string;
  date: string;
  range: string;
  hours: string;
  tone: 'success' | 'primary';
  isWorking?: boolean;
};

const formatLogDate = (dateStr: string) => {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatTime12h = (date: Date, includeSeconds: boolean = false) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  const hoursStr = hours < 10 ? '0' + hours : hours;
  if (includeSeconds) {
    const secondsStr = seconds < 10 ? '0' + seconds : seconds;
    return `${hoursStr}:${minutesStr}:${secondsStr} ${ampm}`;
  }
  return `${hoursStr}:${minutesStr} ${ampm}`;
};

const formatLogTime = (isoString: string) => {
  try {
    return formatTime12h(new Date(isoString), false);
  } catch {
    return '--:--';
  }
};

const getDayTimeRange = (day: AttendanceHistoryDay) => {
  const inPunch = day.records.find(record => record.Punch === 'Check IN');
  const outPunch = [...day.records].reverse().find(record => record.Punch === 'Check OUT');

  if (!inPunch) {
    return 'No records';
  }

  const inTime = formatLogTime(inPunch.PunchDatetime);
  const outTime = outPunch ? formatLogTime(outPunch.PunchDatetime) : 'Active';

  return `${inTime} - ${outTime}`;
};

const mapHistoryToRecentLogs = (history: AttendanceHistoryDay[]): RecentLog[] => {
  return history
    .filter(day => day.records?.some(record => record.Punch === 'Check IN'))
    .slice(0, 3)
    .map((day, index) => {
      const inPunch = day.records.find(record => record.Punch === 'Check IN');
      const outPunch = [...day.records].reverse().find(record => record.Punch === 'Check OUT');
      let isLate = false;

      if (inPunch) {
        const punchDate = new Date(inPunch.PunchDatetime);
        const hours = punchDate.getHours();
        const minutes = punchDate.getMinutes();
        isLate = hours > 9 || (hours === 9 && minutes > 15);
      }

      return {
        id: day.date || String(index),
        date: formatLogDate(day.date),
        range: getDayTimeRange(day),
        hours: day.totalWork || '0h 00m',
        tone: isLate ? 'primary' : 'success',
        isWorking: !outPunch,
      };
    });
};

const AttendanceScreen = () => {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const [currentTime, setCurrentTime] = useState(formatTime12h(new Date(), false));
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const [status, setStatus] = useState<'IN' | 'OUT' | 'BREAK'>('OUT');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [employeeAddress, setEmployeeAddress] = useState<string | null>('Locating...');
  const [officeAddress, setOfficeAddress] = useState<string | null>(null);
  const [employeeName, setEmployeeName] = useState('Employee');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const fabAnim = useRef(new Animated.Value(0)).current;
  const [isFabExpanded, setIsFabExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [todayInTime, setTodayInTime] = useState<string>('--:--');
  const [todayOutTime, setTodayOutTime] = useState<string>('--:--');
  const [todayBreakTime, setTodayBreakTime] = useState<string>('--:--');
  const [isBreakModalVisible, setIsBreakModalVisible] = useState(false);
  const [breakReason, setBreakReason] = useState('');
  const [todayRecords, setTodayRecords] = useState<any[]>([]);
  const [greeting, setGreeting] = useState('Good Morning');

  // Update greeting based on time
  const updateGreeting = useCallback(() => {
    const hour = new Date().getHours();
    if (hour < 12) {
      setGreeting('Good Morning');
    } else if (hour < 17) {
      setGreeting('Good Afternoon');
    } else {
      setGreeting('Good Evening');
    }
  }, []);

  // Dynamic geofencing configuration states
  const [officeLocation, setOfficeLocation] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [officeRadius, setOfficeRadius] = useState<number>(25);
  const [officeName, setOfficeName] = useState<string>('');
  const [geolocationsList, setGeolocationsList] = useState<any[]>([]);
  const [selectedGeoId, setSelectedGeoId] = useState<number | null>(null);

  const {
    employeeLocation,
    accuracyMeters,
    distanceMeters,
    isWithinRange,
    locationError,
    isTracking,
    setOfficeLocation: setLiveOfficeLocation,
    setStatus: setLiveStatus,
  } = useLiveLocation();

  const fetchConfig = useCallback(async () => {
    try {
      const response = await getGeolocations();
      if (response && response.success && Array.isArray(response.geolocations)) {
        const mappedGeos = response.geolocations.map(geo => ({
          ...geo,
          Latitude: Number(geo.Latitude),
          Longitude: Number(geo.Longitude),
          RadiusMeters: Number(geo.RadiusMeters),
        }));

        setGeolocationsList(mappedGeos);

        // Find active geolocation, fallback to the first one available
        const activeGeo = mappedGeos.find(geo => geo.IsActive) || mappedGeos[0];

        if (activeGeo) {
          setSelectedGeoId(activeGeo.pkGeoId);
          const office = {
            latitude: Number(activeGeo.Latitude),
            longitude: Number(activeGeo.Longitude),
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          };
          setOfficeLocation(office);
          setLiveOfficeLocation(office);
          setOfficeRadius(Number(activeGeo.RadiusMeters));
          setOfficeName(activeGeo.OfficeName || 'Main Office');
        }
      }
    } catch (err) {
      console.warn('Failed to load office configuration:', err);
    }
  }, [setLiveOfficeLocation]);

  const handleSelectOffice = useCallback((geo: any) => {
    setSelectedGeoId(geo.pkGeoId);
    const office = {
      latitude: Number(geo.Latitude),
      longitude: Number(geo.Longitude),
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
    };
    setOfficeLocation(office);
    setLiveOfficeLocation(office);
    setOfficeRadius(Number(geo.RadiusMeters));
    setOfficeName(geo.OfficeName || 'Office');
  }, [setLiveOfficeLocation]);

  const fetchRecentLogs = useCallback(async () => {
    try {
      const response = await getAttendanceHistory();
      console.log('[fetchRecentLogs] Response:', JSON.stringify(response, null, 2));
      
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        setRecentLogs(mapHistoryToRecentLogs(response.data));

        // Find today's records (local date YYYY-MM-DD)
        const localDate = new Date();
        const year = localDate.getFullYear();
        const month = String(localDate.getMonth() + 1).padStart(2, '0');
        const day = String(localDate.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;

        console.log('[fetchRecentLogs] Today string:', todayStr);
        const todayData = response.data.find((item: any) => item.date === todayStr);
        console.log('[fetchRecentLogs] Today data:', todayData);
        
        if (todayData && Array.isArray(todayData.records)) {
          setTodayRecords(todayData.records);
          const inRecord = todayData.records.find((r: any) => r.Punch === 'Check IN');
          const outRecord = [...todayData.records].reverse().find((r: any) => r.Punch === 'Check OUT');

          console.log('[fetchRecentLogs] In record:', inRecord);
          console.log('[fetchRecentLogs] Out record:', outRecord);

          if (inRecord) {
            setTodayInTime(formatLogTime(inRecord.PunchDatetime));
          } else {
            setTodayInTime('--:--');
          }

          if (outRecord) {
            setTodayOutTime(formatLogTime(outRecord.PunchDatetime));
          } else {
            setTodayOutTime('--:--');
          }
        } else {
          setTodayRecords([]);
          setTodayInTime('--:--');
          setTodayOutTime('--:--');
        }
      } else {
        setRecentLogs([]);
        setTodayRecords([]);
        setTodayInTime('--:--');
        setTodayOutTime('--:--');
      }
    } catch (error) {
      console.log('[fetchRecentLogs] Error:', error);
      setRecentLogs([]);
      setTodayRecords([]);
      setTodayInTime('--:--');
      setTodayOutTime('--:--');
    }
  }, []);

  const fetchStatusAndName = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setRefreshing(true);
    }
    try {
      try {
        const profile = await getEmployeeProfile();
        if (profile) {
          setEmployeeName(profile.userName || 'Employee');
          setProfileImage(profile.profileImageUrl || null);
        }
      } catch (err) {
        const session = await getAuthSession();
        setEmployeeName(session?.user?.UserName || 'Employee');
        setProfileImage(session?.user?.ProfileImage || null);
      }

      const session = await getAuthSession();
      const response = await getAttendanceStatus(session?.user?.fkEmpId);
      if (response && response.success) {
        let currentPunchStatus: 'IN' | 'OUT' | 'BREAK' = 'OUT';

        if (response.status) {
          const statusText = response.status.toLowerCase().trim();
          if (statusText.includes('break')) {
            currentPunchStatus = 'BREAK';
          } else if (
            statusText.includes('checked in') ||
            statusText.includes('punch in') ||
            statusText.includes('check in') ||
            statusText === 'in' ||
            statusText === 'present' ||
            statusText === 'resume'
          ) {
            currentPunchStatus = 'IN';
          } else {
            currentPunchStatus = 'OUT';
          }
        }

        setStatus(currentPunchStatus);
        setLiveStatus(currentPunchStatus === 'BREAK' ? 'Break' : currentPunchStatus === 'IN' ? 'Check IN' : 'Check OUT');
        setTodayBreakTime(response.todayBreak || '00h 00m');
      }

      await fetchRecentLogs();
    } catch {
      console.warn('Failed to load status or name');
      setRecentLogs([]);
    } finally {
      if (showLoading) {
        setRefreshing(false);
      }
      setIsLoading(false);
    }
  }, [fetchRecentLogs]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      // Reset FAB animation and state on screen focus
      fabAnim.setValue(0);
      setIsFabExpanded(false);

      const loadData = async () => {
        if (isMounted) {
          setIsLoading(true);
          updateGreeting();
          await fetchConfig();
          await fetchStatusAndName();
        }
      };

      loadData();

      // Auto refresh every 10 seconds while the screen is focused
      const interval = setInterval(() => {
        if (isMounted) {
          updateGreeting();
          fetchStatusAndName();
        }
      }, 10000);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }, [fetchConfig, fetchStatusAndName, updateGreeting])
  );

  const handleRefresh = useCallback(async () => {
    await fetchConfig();
    await fetchStatusAndName(true);
  }, [fetchConfig, fetchStatusAndName]);

  const handleFabPress = () => {
    if (isFabExpanded) return;
    setIsFabExpanded(true);

    Animated.timing(fabAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      setTimeout(() => {
        navigation.navigate('MyAttendance');
      }, 200);
    });
  };

  const lastFetchedLocationRef = useRef<{ latitude: number, longitude: number } | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(formatTime12h(new Date(), false));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!officeLocation) return;

    const fetchOfficeAddress = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${officeLocation.latitude}&lon=${officeLocation.longitude}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'AttendanceApp/1.0' } }
        );
        const data = await response.json();
        if (data && data.display_name) {
          setOfficeAddress(data.display_name);
        } else {
          setOfficeAddress('Main Office');
        }
      } catch {
        setOfficeAddress('Main Office');
      }
    };
    fetchOfficeAddress();
  }, [officeLocation]);

  useEffect(() => {
    if (!employeeLocation) {
      setEmployeeAddress('Locating...');
      return;
    }

    const fetchAddress = async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${employeeLocation.latitude}&lon=${employeeLocation.longitude}&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'AttendanceApp/1.0' } }
        );
        const data = await response.json();
        if (data && data.display_name) {
          setEmployeeAddress(data.display_name);
        } else {
          setEmployeeAddress('Address not found');
        }
      } catch {
        setEmployeeAddress('Unable to fetch address');
      }
    };

    if (!lastFetchedLocationRef.current) {
      lastFetchedLocationRef.current = employeeLocation;
      setEmployeeAddress('Fetching location...');
      fetchAddress();
    } else {
      const distanceMoved = getDistance(lastFetchedLocationRef.current, employeeLocation);
      if (distanceMoved > 50) { // Only refetch if moved more than 50 meters
        lastFetchedLocationRef.current = employeeLocation;
        fetchAddress();
      }
    }
  }, [employeeLocation]);

  const distanceLabel =
    distanceMeters === null
      ? 'Office Distance: locating...'
      : `Office Distance: ${distanceMeters > 1000
        ? (distanceMeters / 1000).toFixed(2) + 'km'
        : Math.round(distanceMeters) + 'm'
      }`;

  const isInRadius = distanceMeters !== null && distanceMeters <= officeRadius;
  const canPunch = isWithinRange && isTracking && !isVerifying;
  const isGlowing = isTracking && !isVerifying;

  const buttonColors = useMemo(() => {
    if (status === 'IN' || status === 'BREAK') {
      return Colors.successGradient;
    }
    if (isInRadius) {
      return Colors.accentGradient;
    }
    return ['#94A3B8', '#64748B', '#475569'] as const;
  }, [status, isInRadius]);

  const buttonLabel = useMemo(() => {
    if (isVerifying) {
      return 'Verifying...';
    }
    return status === 'OUT' ? 'Punch in' : 'Punch out';
  }, [isVerifying, status]);

  const pulseAnim1 = useRef(new Animated.Value(0)).current;
  const pulseAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let animation1: Animated.CompositeAnimation | null = null;
    let animation2: Animated.CompositeAnimation | null = null;

    if (isGlowing) {
      pulseAnim1.setValue(0);
      pulseAnim2.setValue(0);

      const createPulseLoop = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      };

      animation1 = createPulseLoop(pulseAnim1, 0);
      animation2 = createPulseLoop(pulseAnim2, 1200);

      animation1.start();
      animation2.start();
    } else {
      pulseAnim1.setValue(0);
      pulseAnim2.setValue(0);
    }

    return () => {
      if (animation1) {
        animation1.stop();
      }
      if (animation2) {
        animation2.stop();
      }
    };
  }, [isGlowing, pulseAnim1, pulseAnim2]);

  const handlePunch = async () => {
    if (!isWithinRange) {
      showLocationAlert(
        'Please wait while we fetch your location to mark attendance.',
      );
      return;
    }

    setIsVerifying(true);

    try {
      const verified = await verifyAttendanceBiometric();

      if (!verified) {
        return;
      }

      if (!employeeLocation) {
        throw new Error('Unable to determine your location. Please check your GPS.');
      }

      const deviceInfo = `${Platform.OS} ${Platform.Version}`;
      let response;

      if (status === 'OUT') {
        // Checking IN
        response = await punchIn(
          employeeLocation.latitude,
          employeeLocation.longitude,
        );
      } else {
        // Checking OUT
        response = await punchOut(
          employeeLocation.latitude,
          employeeLocation.longitude,
        );
      }

      if (response.success) {
        const nextStatus = status === 'OUT' ? 'IN' : 'OUT';
        setStatus(nextStatus);
        setLiveStatus(nextStatus === 'IN' ? 'Check IN' : 'Check OUT');

        postLiveLocation({
          latitude: employeeLocation.latitude,
          longitude: employeeLocation.longitude,
          accuracy: accuracyMeters ?? 0,
          status: status === 'OUT' ? 'Check IN' : 'Check OUT',
        }).catch(() => undefined);
        fetchRecentLogs();
        fetchStatusAndName();
        const punchType = status === 'OUT' ? 'Punch In' : 'Punch Out';
        Alert.alert(punchType + ' Successful', response.message);
      } else {
        throw new Error(response.message || 'Failed to mark attendance.');
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Biometric verification failed. Please try again.';

      // Handle duplicate attendance error - don't show alert, just update status
      if (message.includes('already recorded Check IN') || message.includes('DUPLICATE_ATTENDANCE')) {
        setStatus('IN');
        setLiveStatus('Check IN');
        fetchRecentLogs();
        setIsVerifying(false);
        return;
      }

      // Handle missing Check IN error - show alert and keep current status
      if (message.includes('must Check IN before Check OUT') || message.includes('MISSING_CHECK_IN')) {
        setStatus('OUT');
        setLiveStatus('Check OUT');
        setIsVerifying(false);
        return;
      }

      // Determine an accurate alert title
      const isBiometricError =
        message.toLowerCase().includes('biometric') ||
        message.toLowerCase().includes('fingerprint') ||
        message.toLowerCase().includes('faceid') ||
        message.toLowerCase().includes('cancel');

      const title = isBiometricError ? 'Verification required' : 'Punch Error';
      Alert.alert(title, message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleBreakToggle = async () => {
    if (!isWithinRange) {
      showLocationAlert(
        'Please wait while we fetch your location to mark break.',
      );
      return;
    }

    if (status === 'IN') {
      setBreakReason('');
      setIsBreakModalVisible(true);
      return;
    }

    setIsVerifying(true);

    try {
      const verified = await verifyAttendanceBiometric();

      if (!verified) {
        return;
      }

      if (!employeeLocation) {
        throw new Error('Unable to determine your location. Please check your GPS.');
      }

      const response = await punchResume(
        employeeLocation.latitude,
        employeeLocation.longitude,
      );

      if (response.success) {
        setStatus('IN');
        setLiveStatus('Resume');

        postLiveLocation({
          latitude: employeeLocation.latitude,
          longitude: employeeLocation.longitude,
          accuracy: accuracyMeters ?? 0,
          status: 'Resume',
        }).catch(() => undefined);
        fetchRecentLogs();
        fetchStatusAndName();
        Alert.alert('Resume Successful', response.message);
      } else {
        throw new Error(response.message || 'Failed to record break punch.');
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Biometric verification failed. Please try again.';
      Alert.alert('Punch Error', message);
    } finally {
      setIsVerifying(false);
    }
  };

  const submitBreak = async () => {
    if (!breakReason.trim()) {
      Alert.alert('Validation Error', 'Please enter a reason for the break.');
      return;
    }

    setIsBreakModalVisible(false);
    setIsVerifying(true);

    try {
      const verified = await verifyAttendanceBiometric();

      if (!verified) {
        return;
      }

      if (!employeeLocation) {
        throw new Error('Unable to determine your location. Please check your GPS.');
      }

      const response = await punchBreak(
        employeeLocation.latitude,
        employeeLocation.longitude,
        breakReason.trim(),
      );

      if (response.success) {
        setStatus('BREAK');
        setLiveStatus('Break');

        postLiveLocation({
          latitude: employeeLocation.latitude,
          longitude: employeeLocation.longitude,
          accuracy: accuracyMeters ?? 0,
          status: 'Break',
        }).catch(() => undefined);
        fetchRecentLogs();
        fetchStatusAndName();
        Alert.alert('Break Successful', response.message);
      } else {
        throw new Error(response.message || 'Failed to record break punch.');
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Biometric verification failed. Please try again.';
      Alert.alert('Punch Error', message);
    } finally {
      setIsVerifying(false);
    }
  };

  const mapRegion = useMemo(() => {
    if (!officeLocation) {
      return null;
    }
    if (!employeeLocation) {
      return officeLocation;
    }

    return {
      latitude: (employeeLocation.latitude + officeLocation.latitude) / 2,
      longitude: (employeeLocation.longitude + officeLocation.longitude) / 2,
      latitudeDelta: Math.abs(employeeLocation.latitude - officeLocation.latitude) * 2 + 0.002,
      longitudeDelta: Math.abs(employeeLocation.longitude - officeLocation.longitude) * 2 + 0.002,
    };
  }, [employeeLocation, officeLocation]);

  useEffect(() => {
    if (!employeeLocation || !mapRegion) {
      return;
    }

    mapRef.current?.animateToRegion(mapRegion, 600);
  }, [employeeLocation, mapRegion]);

  // Dynamically calculate shift elapsed time
  const punchInTime = useMemo(() => {
    if (!todayRecords || todayRecords.length === 0) return null;
    let inRecord = todayRecords.find((r: any) => r.Punch === 'Check IN');
    if (!inRecord && todayRecords.length > 0) {
      inRecord = todayRecords[todayRecords.length - 1]; // Fallback to earliest punch of the day
    }
    return inRecord ? new Date(inRecord.PunchDatetime) : null;
  }, [todayRecords]);

  const [elapsedTime, setElapsedTime] = useState('00:00:00');

  useEffect(() => {
    let interval: any;
    if (status !== 'OUT' && punchInTime) {
      const updateTimer = () => {
        const diffMs = new Date().getTime() - punchInTime.getTime();
        if (diffMs > 0) {
          const diffSecs = Math.floor(diffMs / 1000);
          const hrs = Math.floor(diffSecs / 3600);
          const mins = Math.floor((diffSecs % 3600) / 60);
          const secs = diffSecs % 60;
          setElapsedTime(
            `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
          );
        } else {
          setElapsedTime('00:00:00');
        }
      };
      updateTimer();
      interval = setInterval(updateTimer, 1000);
    } else {
      setElapsedTime('00:00:00');
    }
    return () => clearInterval(interval);
  }, [status, punchInTime]);

  const formattedPeriodDate = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  const timelineItems = useMemo(() => {
    if (!todayRecords || todayRecords.length === 0) {
      return [];
    }

    const sorted = [...todayRecords].sort((a, b) => {
      return new Date(b.PunchDatetime).getTime() - new Date(a.PunchDatetime).getTime();
    });

    return sorted.map((rec, index) => {
      let actionName = rec.Punch;
      let iconName: 'play' | 'pause' | 'checkmark' | 'log-out' = 'checkmark';
      let iconColorStr = Colors.success;
      let bgColor = 'rgba(16, 185, 129, 0.1)';
      let detail = rec.Address || 'GEOFENCE LOCATION';

      if (rec.Punch === 'Check IN') {
        actionName = 'Clocked In';
        iconName = 'checkmark';
        iconColorStr = Colors.success;
        bgColor = 'rgba(16, 185, 129, 0.1)';
      } else if (rec.Punch === 'Check OUT') {
        actionName = 'Clocked Out';
        iconName = 'log-out';
        iconColorStr = Colors.primary;
        bgColor = 'rgba(255, 77, 28, 0.1)';
      } else if (rec.Punch === 'Break') {
        actionName = 'Break Started';
        iconName = 'pause';
        iconColorStr = Colors.accent;
        bgColor = 'rgba(255, 179, 0, 0.1)';
        detail = rec.Device || 'LUNCH BREAK REASON';
      } else if (rec.Punch === 'Resume') {
        actionName = 'Resume Session';
        iconName = 'play';
        iconColorStr = '#3B82F6';
        bgColor = 'rgba(59, 130, 246, 0.1)';
        detail = 'MANUAL APP ENTRY';
      }

      return {
        id: rec.PunchDatetime + '-' + index,
        actionName,
        detail,
        time: formatLogTime(rec.PunchDatetime),
        iconName,
        iconColor: iconColorStr,
        bgColor,
      };
    });
  }, [todayRecords]);

  // Initials for avatar fallback
  const userInitials = useMemo(() => {
    if (!employeeName) return 'EM';
    const parts = employeeName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return employeeName.slice(0, 2).toUpperCase();
  }, [employeeName]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Modern Background Gradients */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.08)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      {/* Redesigned Header to match mockup */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.avatarContainer}>
              {profileImage ? (
                <Image
                  source={{ uri: profileImage }}
                  style={styles.avatar}
                />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitials}>{userInitials}</Text>
                </View>
              )}
              <View style={styles.avatarActiveDot} />
            </View>
            <View style={styles.brandingContainer}>
              <Text style={styles.logoText}>{greeting}</Text>
              <Text style={styles.logoName}>{employeeName}</Text>
              <Text style={styles.logoSubtext}>PREMIUM ENTERPRISE</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <PremiumNotificationBell 
              unreadCount={3}
              onPress={() => navigation.navigate('Notifications')}
              size={44}
            />
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: moderateScale(140) + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* Redesigned Active Shift Card */}
        <AppCard style={styles.activeShiftCard}>
          {/* Card Top Row */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.cardHeaderIconFrame}>
                <Ionicons name="calendar" size={moderateScale(18)} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.cardTitle}>Active Shift</Text>
                <Text style={styles.liveSessionLabel}>● LIVE SESSION</Text>
              </View>
            </View>
            <View style={styles.idBadge}>
              <Text style={styles.idBadgeText}>
                ID: #{employeeName || 'EMP'}
              </Text>
            </View>
          </View>

          {/* Scheduled details box */}
          <View style={styles.scheduledBox}>
            <View style={styles.scheduledCol}>
              <Text style={styles.scheduledLabel}>SCHEDULED PERIOD</Text>
              <Text style={styles.scheduledValue}>{formattedPeriodDate}</Text>
            </View>
            <View style={styles.scheduledColRight}>
              <Text style={styles.scheduledLabelRight}>SHIFT WINDOW</Text>
              <Text style={styles.scheduledValueRight}>09:00 — 18:00</Text>
            </View>
          </View>

          {/* Large timer display */}
          <Text style={styles.activeTimerText}>{elapsedTime}</Text>

          {/* Fingerprint Button Area with Concentric pulsing effect */}
          <View style={styles.fingerprintSection}>
            <View style={styles.concentricContainer}>
              <Animated.View
                style={[
                  styles.concentricPulse,
                  styles.concentricPulseOuter,
                  {
                    transform: [{ scale: pulseAnim2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }) }],
                    opacity: isGlowing ? pulseAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }) : 0,
                    borderColor: status === 'OUT' ? 'rgba(255, 77, 28, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                    backgroundColor: status === 'OUT' ? 'rgba(255, 77, 28, 0.02)' : 'rgba(16, 185, 129, 0.02)',
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.concentricPulse,
                  styles.concentricPulseInner,
                  {
                    transform: [{ scale: pulseAnim1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
                    opacity: isGlowing ? pulseAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }) : 0,
                    borderColor: status === 'OUT' ? 'rgba(255, 77, 28, 0.3)' : 'rgba(16, 185, 129, 0.3)',
                    backgroundColor: status === 'OUT' ? 'rgba(255, 77, 28, 0.02)' : 'rgba(16, 185, 129, 0.02)',
                  },
                ]}
              />

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handlePunch}
                disabled={isVerifying}
                style={[
                  styles.fingerprintBtn,
                  status === 'OUT' ? styles.fingerprintBtnInGlow : styles.fingerprintBtnOutGlow,
                ]}
              >
                <Ionicons
                  name="finger-print"
                  size={moderateScale(42)}
                  color={status === 'OUT' ? Colors.primary : Colors.success}
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.fingerprintInstruction}>
              {status === 'OUT' ? 'HOLD TO PUNCH IN' : 'HOLD TO PUNCH OUT'}
            </Text>
            <Text style={styles.fingerprintSubtitle}>IDENTITY VERIFICATION REQUIRED</Text>
          </View>

          {/* Break and Resume Bottom Actions */}
          <View style={styles.cardActionsRow}>
            {status === 'BREAK' ? (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleBreakToggle}
                style={[
                  styles.actionBtn,
                  styles.resumeBtn,
                ]}
              >
                <Ionicons
                  name="play"
                  size={moderateScale(18)}
                  color={Colors.white}
                />
                <Text style={[styles.actionBtnText, { color: Colors.white }]}>RESUME</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleBreakToggle}
                disabled={status === 'OUT'}
                style={[
                  styles.actionBtn,
                  styles.breakBtn,
                  status === 'OUT' && styles.actionBtnDisabled,
                ]}
              >
                <Ionicons
                  name="cafe-outline"
                  size={moderateScale(18)}
                  color={status === 'OUT' ? Colors.textMuted : Colors.textSecondary}
                />
                <Text style={[
                  styles.actionBtnText,
                  status === 'OUT' && { color: Colors.textMuted }
                ]}>BREAK</Text>
              </TouchableOpacity>
            )}
          </View>
        </AppCard>

        {/* Activity Timeline Header */}
        <View style={styles.timelineSectionHeader}>
          <Text style={styles.timelineSectionTitle}>ACTIVITY TIMELINE</Text>
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
            <Ionicons name="options-outline" size={moderateScale(20)} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {/* Timeline Items */}
        {isLoading ? (
          <View style={styles.timelineContainer}>
            {[1, 2].map(i => (
              <View key={i} style={styles.loadingTimelineItem}>
                <Shimmer width={36} height={36} borderRadius={18} style={{ marginRight: 16 }} />
                <View style={{ flex: 1 }}>
                  <Shimmer width="40%" height={14} borderRadius={3} style={{ marginBottom: 6 }} />
                  <Shimmer width="60%" height={10} borderRadius={2} />
                </View>
              </View>
            ))}
          </View>
        ) : timelineItems.length > 0 ? (
          <View style={styles.timelineContainer}>
            {timelineItems.map((item, index) => {
              const isLast = index === timelineItems.length - 1;
              return (
                <View key={item.id} style={styles.timelineItem}>
                  {/* Timeline connecting line */}
                  {!isLast && <View style={styles.timelineLine} />}

                  {/* Timeline icon */}
                  <View style={[styles.timelineIconBg, { backgroundColor: item.bgColor }]}>
                    <Ionicons name={item.iconName as any} size={moderateScale(16)} color={item.iconColor} />
                  </View>

                  {/* Content details */}
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineActionTitle}>{item.actionName}</Text>
                    <Text style={styles.timelineActionDetail}>{item.detail}</Text>
                  </View>

                  {/* Time */}
                  <Text style={styles.timelineTime}>{item.time}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyTimelineCard}>
            <Ionicons name="calendar-outline" size={moderateScale(32)} color={Colors.textMuted} />
            <Text style={styles.emptyTimelineText}>No shift logs recorded for today.</Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Action Button (FAB) - MONTHLY REPORT */}
      <Animated.View
        style={[
          styles.fabContainer,
          {
            width: fabAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [moderateScale(56), moderateScale(180)],
            }),
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleFabPress}
          style={styles.fabButton}
        >
          <View style={styles.fabInnerContent}>
            <Ionicons name="stats-chart" size={moderateScale(22)} color={Colors.white} />
            <Animated.View
              style={{
                opacity: fabAnim,
                marginLeft: fabAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, moderateScale(10)],
                }),
                width: fabAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, moderateScale(110)],
                }),
                overflow: 'hidden',
              }}
            >
              <Text style={styles.fabText} numberOfLines={1}>MONTHLY REPORT</Text>
            </Animated.View>
          </View>
        </TouchableOpacity>
      </Animated.View>

      {/* Break reason modal */}
      <Modal
        visible={isBreakModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsBreakModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Start Break</Text>
            <Text style={styles.modalSubtitle}>Please enter the reason for taking a break:</Text>
            
            <TextInput
              style={styles.reasonInput}
              placeholder="e.g. Lunch, Tea break, Personal work"
              placeholderTextColor={Colors.textMuted}
              value={breakReason}
              onChangeText={setBreakReason}
              multiline={true}
              numberOfLines={3}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setIsBreakModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSubmit]}
                onPress={submitBreak}
              >
                <Text style={styles.modalButtonTextSubmit}>Submit Break</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: moderateScale(300),
    overflow: 'hidden',
  },
  bannerGradient: {
    flex: 1,
  },
  bannerBlurOrb1: {
    position: 'absolute',
    top: -moderateScale(50),
    left: -moderateScale(50),
    width: moderateScale(220),
    height: moderateScale(220),
    borderRadius: moderateScale(110),
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    filter: Platform.OS === 'ios' ? 'blur(40px)' : undefined,
    opacity: Platform.OS === 'android' ? 0.3 : 1,
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(40),
    right: -moderateScale(60),
    width: moderateScale(260),
    height: moderateScale(260),
    borderRadius: moderateScale(130),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    filter: Platform.OS === 'ios' ? 'blur(50px)' : undefined,
    opacity: Platform.OS === 'android' ? 0.3 : 1,
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Theme.spacing.sm,
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: '#E2E8F0',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarActiveDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: moderateScale(12),
    height: moderateScale(12),
    borderRadius: moderateScale(6),
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(15),
    color: Colors.primary,
  },
  brandingContainer: {
    justifyContent: 'center',
  },
  logoText: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: moderateScale(18),
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  logoName: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: '#0F172A',
    marginTop: moderateScale(2),
  },
  logoSubtext: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(8),
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginTop: moderateScale(1),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  headerIconButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.sm,
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
    gap: Theme.spacing.md,
  },
  activeShiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(28),
    padding: Theme.spacing.lg,
    borderWidth: 0,
    ...Theme.shadow.floating,
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowRadius: 24,
    shadowOpacity: 0.8,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  cardHeaderIconFrame: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(14),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  liveSessionLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    color: Colors.success,
    marginTop: moderateScale(2),
  },
  idBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(12),
  },
  idBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(10),
    color: Colors.textSecondary,
  },
  scheduledBox: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(16),
    padding: moderateScale(14),
    marginTop: moderateScale(18),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  scheduledCol: {
    flex: 1.1,
  },
  scheduledColRight: {
    flex: 0.9,
    alignItems: 'flex-end',
  },
  scheduledLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(8),
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: moderateScale(4),
  },
  scheduledLabelRight: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(8),
    color: Colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: moderateScale(4),
    textAlign: 'right',
  },
  scheduledValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: Colors.text,
  },
  scheduledValueRight: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: Colors.primary,
    textAlign: 'right',
  },
  activeTimerText: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: moderateScale(44),
    color: '#0F172A',
    textAlign: 'center',
    marginTop: moderateScale(24),
    letterSpacing: -1,
  },
  fingerprintSection: {
    alignItems: 'center',
    marginTop: moderateScale(12),
    marginBottom: moderateScale(16),
  },
  concentricContainer: {
    width: moderateScale(180),
    height: moderateScale(180),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  concentricPulse: {
    position: 'absolute',
    borderRadius: moderateScale(999),
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 28, 0.3)',
    backgroundColor: 'rgba(255, 77, 28, 0.02)',
  },
  concentricPulseInner: {
    width: moderateScale(124),
    height: moderateScale(124),
  },
  concentricPulseOuter: {
    width: moderateScale(156),
    height: moderateScale(156),
  },
  fingerprintBtn: {
    width: moderateScale(92),
    height: moderateScale(92),
    borderRadius: moderateScale(46),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.floating,
    shadowColor: Colors.primary,
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  fingerprintBtnInGlow: {
    shadowColor: Colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    borderColor: 'rgba(255, 77, 28, 0.25)',
    borderWidth: 1.5,
    elevation: 12,
  },
  fingerprintBtnOutGlow: {
    shadowColor: Colors.success,
    shadowOpacity: 0.45,
    shadowRadius: 24,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderWidth: 1.5,
    elevation: 12,
  },
  fingerprintBtnDisabled: {
    shadowColor: '#000000',
    shadowOpacity: 0.05,
  },
  fingerprintInstruction: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(13),
    color: Colors.primary,
    letterSpacing: 1.2,
    textAlign: 'center',
    marginTop: moderateScale(8),
  },
  fingerprintSubtitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(9),
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: moderateScale(4),
  },
  cardActionsRow: {
    flexDirection: 'row',
    gap: moderateScale(12),
    marginTop: moderateScale(8),
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(14),
    borderRadius: moderateScale(16),
    gap: moderateScale(6),
    ...Theme.shadow.sm,
  },
  actionBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    letterSpacing: 0.8,
  },
  breakBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowOpacity: 0.02,
  },
  actionBtnDisabled: {
    borderColor: '#F1F5F9',
    backgroundColor: '#F8FAFC',
  },
  resumeBtn: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  resumeBtnDisabled: {
    backgroundColor: '#94A3B8',
    shadowOpacity: 0,
  },
  timelineSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: moderateScale(22),
    marginBottom: moderateScale(10),
  },
  timelineSectionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    letterSpacing: 1.5,
  },
  filterButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(10),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.sm,
  },
  timelineContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(24),
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  loadingTimelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(14),
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: moderateScale(18),
    top: moderateScale(38),
    bottom: -moderateScale(14),
    width: 2,
    backgroundColor: '#E2E8F0',
  },
  timelineIconBg: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(14),
    zIndex: 2,
  },
  timelineContent: {
    flex: 1,
  },
  timelineActionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  timelineActionDetail: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(11),
    color: Colors.textMuted,
    marginTop: moderateScale(2),
  },
  timelineTime: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
  },
  emptyTimelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(24),
    paddingVertical: moderateScale(40),
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(8),
    ...Theme.shadow.sm,
  },
  emptyTimelineText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(13),
    color: Colors.textMuted,
  },
  fabContainer: {
    position: 'absolute',
    bottom: moderateScale(24),
    right: Theme.spacing.lg,
    zIndex: 99,
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    overflow: 'hidden',
    ...Theme.shadow.floating,
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  fabButton: {
    flex: 1,
    height: '100%',
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fabInnerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  fabText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    width: '100%',
    maxWidth: 320,
    ...Theme.shadow.floating,
  },
  modalTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(18),
    color: Colors.text,
    marginBottom: Theme.spacing.xs,
  },
  modalSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    marginBottom: Theme.spacing.md,
  },
  reasonInput: {
    fontFamily: 'Outfit_400Regular',
    fontSize: moderateScale(14),
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
    height: moderateScale(80),
    textAlignVertical: 'top',
    marginBottom: Theme.spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(16),
    borderRadius: Theme.borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  modalButtonSubmit: {
    backgroundColor: Colors.primary,
  },
  modalButtonTextCancel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
  },
  modalButtonTextSubmit: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(13),
    color: Colors.white,
  },
});

export default AttendanceScreen;

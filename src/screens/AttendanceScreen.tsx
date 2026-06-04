import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StatusBar, StyleSheet, Alert, Platform, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '../icons/Ionicons';
import MapView, { Circle, Marker, Callout, PROVIDER_GOOGLE } from 'react-native-maps';
import { getDistance } from 'geolib';
import { Colors, Theme } from '../theme/colors';
import { Typography } from '../theme/typography';
import { moderateScale } from '../utils/responsive';
import AppCard from '../components/AppCard';
import { showLocationAlert } from '../hooks/useOfficeDistance';
import { useLiveLocation } from '../context/LiveLocationContext';
import { verifyAttendanceBiometric } from '../services/biometrics';
import {
  punchIn,
  punchOut,
  postLiveLocation,
  getAttendanceStatus,
  getAttendanceConfig,
  getAttendanceHistory,
  AttendanceHistoryDay,
  getGeolocations,
} from '../services/attendance';
import { getAuthSession } from '../services/auth';
import { COMPANY } from '../config/company';

type RecentLog = {
  id: string;
  date: string;
  range: string;
  hours: string;
  tone: 'success' | 'primary';
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

const formatLogTime = (isoString: string) => {
  try {
    return new Date(isoString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
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
      };
    });
};

const kamdenuLat = 19.096388750705227;
const kamdenuLng = 73.01687580932347;

const koparkhairneLat = 19.102727966839172;
const koparkhairneLng = 73.00876110747178;

const textoLat = 19.111448929845803;
const textoLng = 73.0154910366839;

const getPreciseCoordinates = (officeName: string, defaultLat: number, defaultLng: number) => {
  const name = officeName.toLowerCase();
  if (name.includes('kamdenu')) {
    return { latitude: kamdenuLat, longitude: kamdenuLng };
  }
  if (name.includes('koparkhairne')) {
    return { latitude: koparkhairneLat, longitude: koparkhairneLng };
  }
  if (name.includes('texto')) {
    return { latitude: textoLat, longitude: textoLng };
  }
  return { latitude: defaultLat, longitude: defaultLng };
};

const AttendanceScreen = () => {
  const navigation = useNavigation<any>();
  const [currentTime, setCurrentTime] = useState(new Date().toLocaleTimeString());
  const [recentLogs, setRecentLogs] = useState<RecentLog[]>([]);
  const currentDate = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const [status, setStatus] = useState<'IN' | 'OUT'>('OUT');
  const [isVerifying, setIsVerifying] = useState(false);
  const [employeeAddress, setEmployeeAddress] = useState<string | null>('Locating...');
  const [officeAddress, setOfficeAddress] = useState<string | null>(COMPANY.office.address);
  const [employeeName, setEmployeeName] = useState('Employee');
  const [refreshing, setRefreshing] = useState(false);

  // Dynamic geofencing configuration states
  const [officeLocation, setOfficeLocation] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>({
    latitude: COMPANY.office.latitude,
    longitude: COMPANY.office.longitude,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [officeRadius, setOfficeRadius] = useState<number>(COMPANY.office.radiusMeters);
  const [officeName, setOfficeName] = useState<string>(COMPANY.office.name);
  const [geolocationsList, setGeolocationsList] = useState<any[]>([
    {
      pkGeoId: COMPANY.office.id,
      OfficeName: COMPANY.office.name,
      Latitude: COMPANY.office.latitude,
      Longitude: COMPANY.office.longitude,
      RadiusMeters: COMPANY.office.radiusMeters,
      IsActive: true,
    },
    { pkGeoId: 102, OfficeName: 'Koparkhairne', Latitude: koparkhairneLat, Longitude: koparkhairneLng, RadiusMeters: 25, IsActive: false },
    { pkGeoId: 103, OfficeName: 'Texto', Latitude: textoLat, Longitude: textoLng, RadiusMeters: 25, IsActive: false },
  ]);
  const [selectedGeoId, setSelectedGeoId] = useState<number | null>(COMPANY.office.id);

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
        let mappedGeos = response.geolocations.map(geo => {
          const coords = getPreciseCoordinates(
            geo.OfficeName || geo.officeName || '',
            Number(geo.Latitude),
            Number(geo.Longitude)
          );
          return {
            ...geo,
            Latitude: coords.latitude,
            Longitude: coords.longitude,
          };
        });

        // Add predefined test locations if they are not already returned by API
        const predefined = [
          { pkGeoId: 101, OfficeName: 'Kamdenu', Latitude: kamdenuLat, Longitude: kamdenuLng, RadiusMeters: 25, IsActive: false },
          { pkGeoId: 102, OfficeName: 'Koparkhairne', Latitude: koparkhairneLat, Longitude: koparkhairneLng, RadiusMeters: 25, IsActive: false },
          { pkGeoId: 103, OfficeName: 'Texto', Latitude: textoLat, Longitude: textoLng, RadiusMeters: 25, IsActive: false },
        ];

        predefined.forEach(pre => {
          const exists = mappedGeos.some(geo => (geo.OfficeName || '').toLowerCase().includes(pre.OfficeName.toLowerCase()));
          if (!exists) {
            mappedGeos.push(pre as any);
          }
        });

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
      if (response.success && Array.isArray(response.data) && response.data.length > 0) {
        setRecentLogs(mapHistoryToRecentLogs(response.data));
      } else {
        setRecentLogs([]);
      }
    } catch {
      setRecentLogs([]);
    }
  }, []);

  const fetchStatusAndName = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setRefreshing(true);
    }
    try {
      const session = await getAuthSession();
      setEmployeeName(session?.user?.UserName || 'Employee');

      const response = await getAttendanceStatus();
      if (response) {
        let checkedIn = false;
        
        if (response.nextSuggestedPunch) {
          checkedIn = response.nextSuggestedPunch.toUpperCase() === 'CHECK OUT';
        } else if (response.status) {
          const statusText = response.status.toLowerCase();
          checkedIn =
            (statusText.includes('checked in') ||
            statusText.includes('punch in') ||
            statusText.includes('check in') ||
            statusText === 'in' ||
            statusText === 'present') &&
            !statusText.includes('not checked in');
        }
        
        setStatus(checkedIn ? 'IN' : 'OUT');
        setLiveStatus(checkedIn ? 'Check IN' : 'Check OUT');
      }

      await fetchRecentLogs();
    } catch {
      console.warn('Failed to load status or name');
      setRecentLogs([]);
    } finally {
      if (showLoading) {
        setRefreshing(false);
      }
    }
  }, [fetchRecentLogs]);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const loadData = async () => {
        if (isMounted) {
          await fetchConfig();
          await fetchStatusAndName();
        }
      };

      loadData();

      // Auto refresh every 10 seconds while the screen is focused
      const interval = setInterval(() => {
        if (isMounted) {
          fetchStatusAndName();
        }
      }, 10000);

      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }, [fetchConfig, fetchStatusAndName])
  );

  const handleRefresh = useCallback(async () => {
    await fetchConfig();
    await fetchStatusAndName(true);
  }, [fetchConfig, fetchStatusAndName]);
  
  const lastFetchedLocationRef = useRef<{latitude: number, longitude: number} | null>(null);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toLocaleTimeString());
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
      : `Office Distance: ${
          distanceMeters > 1000
            ? (distanceMeters / 1000).toFixed(2) + 'km'
            : Math.round(distanceMeters) + 'm'
        }`;

  const isInRadius = distanceMeters !== null && distanceMeters <= officeRadius;
  const canPunch = isWithinRange && isTracking && !isVerifying;
  const isGlowing = canPunch;

  const buttonColors = useMemo(() => {
    if (status === 'IN') {
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
          'Check IN',
          'Reached location and starting work',
          deviceInfo,
        );
      } else {
        // Checking OUT
        response = await punchOut(
          employeeLocation.latitude,
          employeeLocation.longitude,
        );
      }

      if (response.success) {
        const nextStatus = status === 'IN' ? 'OUT' : 'IN';
        setStatus(nextStatus);
        setLiveStatus(nextStatus === 'IN' ? 'Check IN' : 'Check OUT');
        postLiveLocation({
          latitude: employeeLocation.latitude,
          longitude: employeeLocation.longitude,
          accuracy: accuracyMeters ?? 0,
          status: nextStatus === 'IN' ? 'Check IN' : 'Check OUT',
        }).catch(() => undefined);
        fetchRecentLogs();
        Alert.alert('Success', response.message);
      } else {
        throw new Error(response.message || 'Failed to mark attendance.');
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Biometric verification failed. Please try again.';

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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Stunning Background Banner */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.15)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>GOOD MORNING</Text>
            <Text style={styles.name}>{employeeName}</Text>
          </View>
          <View style={[styles.statusPill, isWithinRange && styles.statusPillActive]}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: isWithinRange
                    ? Colors.success
                    : locationError
                      ? Colors.error
                      : Colors.warning,
                },
              ]}
            />
            <Text style={[styles.statusText, isWithinRange && styles.statusTextActive]}>
              {locationError
                ? 'GPS Error'
                : employeeLocation
                  ? 'Ready'
                  : 'Locating'}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        <AppCard style={styles.clockCard}>
          <Text style={styles.dateLabel}>{currentDate}</Text>
          <View style={styles.clockContainer}>
            <Text style={styles.clock}>{currentTime.split(' ')[0]}</Text>
            {currentTime.split(' ')[1] && (
              <Text style={styles.clockAmpm}> {currentTime.split(' ')[1]}</Text>
            )}
          </View>
          {locationError ? (
            <Text style={styles.locationError}>{locationError}</Text>
          ) : null}
        </AppCard>

        <View style={styles.statsRow}>
          <AppCard style={styles.statCard}>
            <View style={styles.statIconFrame}>
              <Ionicons name="time" size={moderateScale(18)} color={Colors.primary} />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>IN TIME</Text>
              <Text style={styles.statValue}>09:15 AM</Text>
            </View>
          </AppCard>
          
          <AppCard style={styles.statCard}>
            <View style={[styles.statIconFrame, { backgroundColor: 'rgba(255, 179, 0, 0.08)' }]}>
              <Ionicons name="timer" size={moderateScale(18)} color={Colors.accent} />
            </View>
            <View style={styles.statTextContainer}>
              <Text style={styles.statLabel}>WORK HRS</Text>
              <Text style={styles.statValue}>05:30 h</Text>
            </View>
          </AppCard>
        </View>

        <View style={styles.punchContainer}>
          <Text style={styles.sectionTitle}>Mark Attendance</Text>
          <Text style={styles.punchHint}>
            {canPunch
              ? 'Verify your biometric identity to punch in or out.'
              : 'Waiting for dynamic GPS geolocation signal...'}
          </Text>

          <View style={styles.punchButtonWrapper}>
            {isGlowing && (
              <>
                <Animated.View
                  style={[
                    styles.punchPulse,
                    {
                      backgroundColor: status === 'IN' ? Colors.secondary : Colors.primary,
                      transform: [{ scale: pulseAnim1.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
                      opacity: pulseAnim1.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                    },
                  ]}
                />
                <Animated.View
                  style={[
                    styles.punchPulse,
                    {
                      backgroundColor: status === 'IN' ? Colors.secondary : Colors.primary,
                      transform: [{ scale: pulseAnim2.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] }) }],
                      opacity: pulseAnim2.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                    },
                  ]}
                />
              </>
            )}
            
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handlePunch}
              disabled={!canPunch}
              style={[
                styles.punchButton,
                !canPunch && styles.punchButtonDisabled,
                status === 'IN' && styles.punchButtonOut,
              ]}
            >
              <View style={styles.punchButtonInner}>
                <Ionicons
                  name={status === 'OUT' ? 'finger-print' : 'log-out-outline'}
                  size={moderateScale(36)}
                  color={!canPunch ? Colors.textMuted : Colors.white}
                />
                <Text style={[styles.punchLabel, !canPunch && { color: Colors.textMuted }]}>
                  {buttonLabel}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {recentLogs.length > 0 ? (
          <View style={styles.logsSection}>
            <View style={styles.logsHeader}>
              <Text style={styles.sectionTitle}>Recent Logs</Text>
              <TouchableOpacity onPress={() => navigation.getParent()?.navigate('MyAttendance')}>
                <Text style={styles.viewAll}>View All</Text>
              </TouchableOpacity>
            </View>

            {recentLogs.map(log => (
              <View key={log.id} style={styles.logItem}>
                <View style={[styles.logIcon, { backgroundColor: log.tone === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255, 77, 28, 0.1)' }]}>
                  <Ionicons 
                    name={log.tone === 'success' ? 'checkmark' : 'time'} 
                    size={moderateScale(18)} 
                    color={log.tone === 'success' ? Colors.success : Colors.primary} 
                  />
                </View>
                <View style={styles.logBody}>
                  <Text style={styles.logDate}>{log.date}</Text>
                  <Text style={styles.logRange}>{log.range}</Text>
                </View>
                <View style={styles.logMeta}>
                  <Text style={styles.logHours}>{log.hours}</Text>
                  <Text style={styles.logMetaLabel}>Worked</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: moderateScale(280),
    overflow: 'hidden',
  },
  bannerGradient: {
    flex: 1,
  },
  bannerBlurOrb1: {
    position: 'absolute',
    top: -moderateScale(50),
    left: -moderateScale(50),
    width: moderateScale(200),
    height: moderateScale(200),
    borderRadius: moderateScale(100),
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
    filter: 'blur(40px)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(40),
    right: -moderateScale(60),
    width: moderateScale(250),
    height: moderateScale(250),
    borderRadius: moderateScale(125),
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
    filter: 'blur(50px)',
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
  greeting: {
    ...Typography.label,
    color: Colors.textSecondary,
    fontSize: moderateScale(10),
    letterSpacing: 1.5,
    marginBottom: moderateScale(2),
  },
  name: {
    ...Typography.heading,
    fontSize: moderateScale(22),
    color: Colors.text,
    letterSpacing: -0.5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    borderRadius: Theme.borderRadius.pill,
    gap: moderateScale(6),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Theme.shadow.sm,
    shadowOpacity: 0.02,
  },
  statusPillActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusDot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
  },
  statusText: {
    ...Typography.label,
    fontSize: moderateScale(10),
    color: Colors.textSecondary,
    fontWeight: '700',
  },
  statusTextActive: {
    color: Colors.successDark,
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: 120,
    gap: Theme.spacing.lg,
  },
  clockCard: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  dateLabel: {
    ...Typography.label,
    fontSize: moderateScale(10),
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: Theme.spacing.sm,
  },
  clockContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  clock: {
    ...Typography.heading,
    fontSize: moderateScale(48),
    color: Colors.text,
    letterSpacing: -1.5,
  },
  clockAmpm: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.textMuted,
    marginLeft: moderateScale(4),
  },
  locationError: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Theme.spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.lg,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.sm,
  },
  statIconFrame: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(8),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(12),
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    ...Typography.label,
    fontSize: moderateScale(9),
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: moderateScale(2),
  },
  statValue: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
  },
  punchContainer: {
    alignItems: 'center',
    paddingVertical: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.lg,
  },
  sectionTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
    letterSpacing: -0.5,
  },
  punchHint: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: moderateScale(6),
    marginBottom: moderateScale(32),
  },
  punchButtonWrapper: {
    width: moderateScale(180),
    height: moderateScale(180),
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  punchPulse: {
    position: 'absolute',
    width: moderateScale(160),
    height: moderateScale(160),
    borderRadius: moderateScale(80),
    backgroundColor: Colors.primary,
  },
  punchButton: {
    width: moderateScale(160),
    height: moderateScale(160),
    borderRadius: moderateScale(80),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.floating,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
  },
  punchButtonOut: {
    backgroundColor: Colors.secondary,
    shadowColor: Colors.secondary,
  },
  punchButtonDisabled: {
    backgroundColor: Colors.surfaceMuted,
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  punchButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: moderateScale(8),
  },
  punchLabel: {
    ...Typography.label,
    fontSize: moderateScale(14),
    color: Colors.white,
    letterSpacing: 1,
  },
  logsSection: {
    marginTop: Theme.spacing.md,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  viewAll: {
    ...Typography.label,
    fontSize: moderateScale(12),
    color: Colors.primary,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.xl,
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.sm,
  },
  logIcon: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  logBody: {
    flex: 1,
  },
  logDate: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
  },
  logRange: {
    ...Typography.caption,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginTop: moderateScale(2),
  },
  logMeta: {
    alignItems: 'flex-end',
  },
  logHours: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
  },
  logMetaLabel: {
    ...Typography.caption,
    fontSize: moderateScale(11),
    color: Colors.textMuted,
    marginTop: moderateScale(2),
  },
});

export default AttendanceScreen;

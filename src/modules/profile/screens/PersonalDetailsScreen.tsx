import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppBar from '../../../components/AppBar';
import * as ImagePicker from 'expo-image-picker';

import {
  EmployeeProfile,
  getEmployeeProfile,
  updateEmployeeProfile,
  uploadProfileImage,
} from '../services/profile';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { API_BASE_URL } from '../../../config/api';
import { clearAuthSession } from '../../auth/services/auth';

const isInvalidTokenError = (message: string) =>
  message.toLowerCase().includes('token is not valid') ||
  message.toLowerCase().includes('authentication required');

const getFullImageUrl = (url: string | null | undefined): string | null => {
  if (!url) {
    return null;
  }
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${API_BASE_URL.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
};

const formatDateForDisplay = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      const dd = String(date.getDate()).padStart(2, '0');
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const yyyy = date.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    }
  } catch {}
  return dateStr;
};

const PersonalDetailsScreen = ({ navigation }: any) => {
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBottomSheetVisible, setIsBottomSheetVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [avatarImageError, setAvatarImageError] = useState(false);

  // New editable fields
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [presentAddress, setPresentAddress] = useState('');
  const [permanentAddress, setPermanentAddress] = useState('');

  // Focus states
  const [isNameFocused, setIsNameFocused] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isDobFocused, setIsDobFocused] = useState(false);
  const [isBloodGroupFocused, setIsBloodGroupFocused] = useState(false);
  const [isPresentAddressFocused, setIsPresentAddressFocused] = useState(false);
  const [isPermanentAddressFocused, setIsPermanentAddressFocused] = useState(false);

  // DOB Custom Calendar states & logic
  const CALENDAR_MONTHS = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const [isDobCalendarOpen, setIsDobCalendarOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date().getMonth());
  const [currentCalendarYear, setCurrentCalendarYear] = useState(new Date().getFullYear());
  const [showYearSelector, setShowYearSelector] = useState(false);

  const getDaysInMonth = useCallback((year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  }, []);

  const getFirstDayOfMonth = useCallback((year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  }, []);

  const handleOpenDobCalendar = useCallback(() => {
    let initialDate = new Date();
    if (dob) {
      const parsed = new Date(dob);
      if (!isNaN(parsed.getTime())) {
        initialDate = parsed;
      }
    }
    setCurrentCalendarMonth(initialDate.getMonth());
    setCurrentCalendarYear(initialDate.getFullYear());
    setShowYearSelector(false);
    setIsDobCalendarOpen(true);
  }, [dob]);

  const handlePrevMonth = useCallback(() => {
    setCurrentCalendarMonth(prev => {
      if (prev === 0) {
        setCurrentCalendarYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentCalendarMonth(prev => {
      if (prev === 11) {
        setCurrentCalendarYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const handleSelectDate = useCallback((dateStr: string) => {
    setDob(dateStr);
    setIsDobCalendarOpen(false);
  }, []);

  const calendarDaysGrid = useMemo(() => {
    const totalDays = getDaysInMonth(currentCalendarYear, currentCalendarMonth);
    const firstDayIndex = getFirstDayOfMonth(currentCalendarYear, currentCalendarMonth);

    const prevMonthYear = currentCalendarMonth === 0 ? currentCalendarYear - 1 : currentCalendarYear;
    const prevMonth = currentCalendarMonth === 0 ? 11 : currentCalendarMonth - 1;
    const totalDaysPrev = getDaysInMonth(prevMonthYear, prevMonth);

    const grid = [];
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Trailing days from previous month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = totalDaysPrev - i;
      const mm = String(prevMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateString = `${prevMonthYear}-${mm}-${dd}`;
      grid.push({
        day,
        month: prevMonth,
        year: prevMonthYear,
        dateString,
        isToday: dateString === todayStr,
      });
    }

    // Days of current month
    for (let day = 1; day <= totalDays; day++) {
      const mm = String(currentCalendarMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateString = `${currentCalendarYear}-${mm}-${dd}`;
      grid.push({
        day,
        month: currentCalendarMonth,
        year: currentCalendarYear,
        dateString,
        isToday: dateString === todayStr,
      });
    }

    // Leading days from next month
    const remainingSlots = grid.length % 7;
    if (remainingSlots > 0) {
      const nextMonthYear = currentCalendarMonth === 11 ? currentCalendarYear + 1 : currentCalendarYear;
      const nextMonth = currentCalendarMonth === 11 ? 0 : currentCalendarMonth + 1;
      const slotsToAdd = 7 - remainingSlots;
      for (let day = 1; day <= slotsToAdd; day++) {
        const mm = String(nextMonth + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const dateString = `${nextMonthYear}-${mm}-${dd}`;
        grid.push({
          day,
          month: nextMonth,
          year: nextMonthYear,
          dateString,
          isToday: dateString === todayStr,
        });
      }
    }

    return grid;
  }, [currentCalendarMonth, currentCalendarYear, getDaysInMonth, getFirstDayOfMonth]);

  const resetToLogin = useCallback(async () => {
    await clearAuthSession();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }, [navigation]);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const employeeProfile = await getEmployeeProfile();

        if (!isMounted) {
          return;
        }

        setProfile(employeeProfile);
        setUserName(employeeProfile.userName || '');
        setEmail(employeeProfile.email || '');
        setPhone(employeeProfile.phone || '');
        setProfileImageUrl(employeeProfile.profileImageUrl || null);
        
        let formattedDob = '';
        if (employeeProfile.dob) {
          try {
            formattedDob = new Date(employeeProfile.dob).toISOString().split('T')[0];
          } catch {
            formattedDob = employeeProfile.dob;
          }
        }
        setDob(formattedDob);
        setBloodGroup(employeeProfile.bloodGroup || '');
        setPresentAddress(employeeProfile.presentAddress || '');
        setPermanentAddress(employeeProfile.permanentAddress || '');

        setAvatarImageError(false);
        setErrorMessage(null);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Unable to load profile details.';

        if (isInvalidTokenError(message)) {
          resetToLogin();
          return;
        }

        setErrorMessage(message);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [navigation, resetToLogin]);

  const initials = useMemo(
    () =>
      (userName || 'Employee')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase() || 'E',
    [userName],
  );

  const dojDisplay = useMemo(() => {
    if (!profile?.doj) return '-';
    try {
      return new Date(profile.doj).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return profile.doj;
    }
  }, [profile?.doj]);

  const handleSave = async () => {
    if (!userName.trim()) {
      setErrorMessage('Name is required.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updatedProfile = await updateEmployeeProfile({
        userName: userName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        profileImageUrl,
        dob: dob.trim() || null,
        bloodGroup: bloodGroup.trim() || null,
        permanentAddress: permanentAddress.trim() || null,
        presentAddress: presentAddress.trim() || null,
      });

      setProfile(updatedProfile);
      setUserName(updatedProfile.userName || '');
      setEmail(updatedProfile.email || '');
      setPhone(updatedProfile.phone || '');
      setProfileImageUrl(updatedProfile.profileImageUrl || profileImageUrl);
      
      let formattedDob = '';
      if (updatedProfile.dob) {
        try {
          formattedDob = new Date(updatedProfile.dob).toISOString().split('T')[0];
        } catch {
          formattedDob = updatedProfile.dob;
        }
      }
      setDob(formattedDob);
      setBloodGroup(updatedProfile.bloodGroup || '');
      setPresentAddress(updatedProfile.presentAddress || '');
      setPermanentAddress(updatedProfile.permanentAddress || '');

      setAvatarImageError(false);
      Alert.alert('Profile updated', 'Your personal details were saved successfully.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to update profile details.';

      if (isInvalidTokenError(message)) {
        resetToLogin();
        return;
      }

      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };


  const handleImageResult = async (asset: { uri: string; fileName?: string | null; type?: string | null }) => {
    if (!asset.uri) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const updatedProfile = await uploadProfileImage(
        asset.uri,
        asset.fileName || undefined,
        asset.type || undefined,
      );

      setProfile(updatedProfile);
      setProfileImageUrl(updatedProfile.profileImageUrl);
      setAvatarImageError(false);
      Alert.alert('Success', 'Profile image updated successfully.');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to upload profile image.';

      if (isInvalidTokenError(message)) {
        resetToLogin();
        return;
      }

      setErrorMessage(message);
    } finally {
      setIsSaving(false);
    }
  };

  const openCamera = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Camera permission is needed to take a profile photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets?.[0];
    if (asset) {
      handleImageResult({
        uri: asset.uri,
        fileName: asset.fileName || 'profile.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
    }
  };

  const openGallery = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permission required', 'Gallery permission is needed to select a profile photo.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      allowsMultipleSelection: false,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets?.[0];
    if (asset) {
      handleImageResult({
        uri: asset.uri,
        fileName: asset.fileName || 'profile.jpg',
        type: asset.mimeType || 'image/jpeg',
      });
    }
  };

  const showImagePickerOptions = () => {
    if (isLoading || isSaving) {
      return;
    }
    setIsBottomSheetVisible(true);
  };

  const handleSheetAction = (action: () => void) => {
    setIsBottomSheetVisible(false);
    setTimeout(() => {
      action();
    }, 300); // Wait for modal to close
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Custom AppBar */}
      <AppBar title="Personal Details" showBackButton onBackPress={() => navigation.goBack()} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        scrollEventThrottle={16}
        decelerationRate="normal"
      >
        {/* Premium Header with Glassmorphism */}
        <View style={styles.headerContainer}>
          <View style={styles.bannerContainer}>
            <LinearGradient
              colors={['rgba(255, 77, 28, 0.08)', 'rgba(255, 77, 28, 0.0)']}
              style={styles.bannerGradient}
            />
            <View style={styles.bannerBlurOrb1} />
            <View style={styles.bannerBlurOrb2} />
          </View>
          
          <View style={styles.headerContent}>
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.avatarContainer}
              onPress={showImagePickerOptions}
            >
              <View style={[styles.avatarCircle, isSaving && styles.avatarDisabled]}>
                {profileImageUrl && !avatarImageError ? (
                  <Image
                    source={{ uri: getFullImageUrl(profileImageUrl) || undefined }}
                    style={styles.avatarImage}
                    onError={() => setAvatarImageError(true)}
                  />
                ) : (
                  <View style={styles.avatarInitialsContainer}>
                    <Text style={styles.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </View>
              <View style={styles.editAvatarBadge}>
                <Ionicons name="camera" size={moderateScale(14)} color={Colors.white} />
              </View>
            </TouchableOpacity>

            <View style={styles.headerText}>
              <Text style={styles.headerName} numberOfLines={1}>{userName || 'Employee'}</Text>
              <Text style={styles.headerId}>
                {profile?.empCode ? `ID: ${profile.empCode}` : (profile?.fkEmpId ? `ID: ${profile.fkEmpId}` : 'Update profile')}
              </Text>
              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={moderateScale(12)} color={Colors.success} />
                <Text style={styles.statusText}>Active Employee</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Error Message */}
        {errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={moderateScale(16)} color={Colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <View style={styles.formContainer}>
          {/* Personal Information Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="person" size={moderateScale(18)} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Personal Information</Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={[styles.inputCard, isNameFocused && styles.inputCardFocused]}>
              <View style={styles.inputRow}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="person-outline" size={moderateScale(18)} color={isNameFocused ? Colors.primary : Colors.textMuted} />
                </View>
                <View style={styles.inputContent}>
                  <Text style={[styles.inputLabel, isNameFocused && styles.inputLabelFocused]}>Full Name</Text>
                  <TextInput
                    value={userName}
                    onChangeText={setUserName}
                    placeholder="Enter your full name"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.inputField}
                    editable={!isLoading && !isSaving}
                    onFocus={() => setIsNameFocused(true)}
                    onBlur={() => setIsNameFocused(false)}
                  />
                </View>
              </View>
            </View>

            <View style={[styles.inputCard, isEmailFocused && styles.inputCardFocused]}>
              <View style={styles.inputRow}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="mail-outline" size={moderateScale(18)} color={isEmailFocused ? Colors.primary : Colors.textMuted} />
                </View>
                <View style={styles.inputContent}>
                  <Text style={[styles.inputLabel, isEmailFocused && styles.inputLabelFocused]}>Email Address</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter your email"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    style={styles.inputField}
                    editable={!isLoading && !isSaving}
                    onFocus={() => setIsEmailFocused(true)}
                    onBlur={() => setIsEmailFocused(false)}
                  />
                </View>
              </View>
            </View>

            <View style={[styles.inputCard, isPhoneFocused && styles.inputCardFocused]}>
              <View style={styles.inputRow}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="call-outline" size={moderateScale(18)} color={isPhoneFocused ? Colors.primary : Colors.textMuted} />
                </View>
                <View style={styles.inputContent}>
                  <Text style={[styles.inputLabel, isPhoneFocused && styles.inputLabelFocused]}>Phone Number</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter your phone number"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="phone-pad"
                    style={styles.inputField}
                    editable={!isLoading && !isSaving}
                    onFocus={() => setIsPhoneFocused(true)}
                    onBlur={() => setIsPhoneFocused(false)}
                  />
                </View>
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleOpenDobCalendar}
              disabled={isLoading || isSaving}
              style={[styles.inputCard, isDobCalendarOpen && styles.inputCardFocused]}
            >
              <View style={styles.inputRow}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="calendar-outline" size={moderateScale(18)} color={isDobCalendarOpen ? Colors.primary : Colors.textMuted} />
                </View>
                <View style={[styles.inputContent, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, isDobCalendarOpen && styles.inputLabelFocused]}>Date of Birth</Text>
                    <Text style={[styles.inputField, !dob && { color: Colors.textMuted }]}>
                      {dob ? formatDateForDisplay(dob) : 'Select Date of Birth'}
                    </Text>
                  </View>
                  <Ionicons name="chevron-down" size={moderateScale(16)} color={Colors.textMuted} />
                </View>
              </View>
            </TouchableOpacity>

            <View style={[styles.inputCard, isBloodGroupFocused && styles.inputCardFocused]}>
              <View style={styles.inputRow}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="water-outline" size={moderateScale(18)} color={isBloodGroupFocused ? Colors.primary : Colors.textMuted} />
                </View>
                <View style={styles.inputContent}>
                  <Text style={[styles.inputLabel, isBloodGroupFocused && styles.inputLabelFocused]}>Blood Group</Text>
                  <TextInput
                    value={bloodGroup}
                    onChangeText={setBloodGroup}
                    placeholder="e.g., A+, B-, O+"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.inputField}
                    editable={!isLoading && !isSaving}
                    onFocus={() => setIsBloodGroupFocused(true)}
                    onBlur={() => setIsBloodGroupFocused(false)}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Address Information Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="location" size={moderateScale(18)} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Address Information</Text>
          </View>

          <View style={styles.inputGroup}>
            <View style={[styles.inputCard, isPresentAddressFocused && styles.inputCardFocused]}>
              <View style={styles.inputRow}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="home-outline" size={moderateScale(18)} color={isPresentAddressFocused ? Colors.primary : Colors.textMuted} />
                </View>
                <View style={styles.inputContent}>
                  <Text style={[styles.inputLabel, isPresentAddressFocused && styles.inputLabelFocused]}>Present Address</Text>
                  <TextInput
                    value={presentAddress}
                    onChangeText={setPresentAddress}
                    placeholder="Enter your present address"
                    placeholderTextColor={Colors.textMuted}
                    style={[styles.inputField, styles.textArea]}
                    multiline
                    numberOfLines={3}
                    editable={!isLoading && !isSaving}
                    onFocus={() => setIsPresentAddressFocused(true)}
                    onBlur={() => setIsPresentAddressFocused(false)}
                  />
                </View>
              </View>
            </View>

            <View style={[styles.inputCard, isPermanentAddressFocused && styles.inputCardFocused]}>
              <View style={styles.inputRow}>
                <View style={styles.inputIconContainer}>
                  <Ionicons name="business-outline" size={moderateScale(18)} color={isPermanentAddressFocused ? Colors.primary : Colors.textMuted} />
                </View>
                <View style={styles.inputContent}>
                  <Text style={[styles.inputLabel, isPermanentAddressFocused && styles.inputLabelFocused]}>Permanent Address</Text>
                  <TextInput
                    value={permanentAddress}
                    onChangeText={setPermanentAddress}
                    placeholder="Enter your permanent address"
                    placeholderTextColor={Colors.textMuted}
                    style={[styles.inputField, styles.textArea]}
                    multiline
                    numberOfLines={3}
                    editable={!isLoading && !isSaving}
                    onFocus={() => setIsPermanentAddressFocused(true)}
                    onBlur={() => setIsPermanentAddressFocused(false)}
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Employee Information Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="briefcase" size={moderateScale(18)} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Employee Information</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons name="person-outline" size={moderateScale(20)} color={Colors.primary} />
              <Text style={styles.infoLabel}>Gender</Text>
              <Text style={styles.infoValue}>{profile?.gender || '-'}</Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="heart-outline" size={moderateScale(20)} color={Colors.primary} />
              <Text style={styles.infoLabel}>Marital Status</Text>
              <Text style={styles.infoValue}>{profile?.maritalStatus || '-'}</Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="id-card-outline" size={moderateScale(20)} color={Colors.primary} />
              <Text style={styles.infoLabel}>Employee ID</Text>
              <Text style={styles.infoValue}>{profile?.pkUserId || '-'}</Text>
            </View>

            {profile?.empCode && (
              <View style={styles.infoCard}>
                <Ionicons name="barcode-outline" size={moderateScale(20)} color={Colors.primary} />
                <Text style={styles.infoLabel}>Employee Code</Text>
                <Text style={styles.infoValue}>{profile.empCode}</Text>
              </View>
            )}

            <View style={styles.infoCard}>
              <Ionicons name="calendar-clear-outline" size={moderateScale(20)} color={Colors.primary} />
              <Text style={styles.infoLabel}>Date of Joining</Text>
              <Text style={styles.infoValue}>{dojDisplay}</Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="briefcase-outline" size={moderateScale(20)} color={Colors.primary} />
              <Text style={styles.infoLabel}>Employment Type</Text>
              <Text style={styles.infoValue}>{profile?.employmentType || '-'}</Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="trending-up" size={moderateScale(20)} color={Colors.primary} />
              <Text style={styles.infoLabel}>Experience</Text>
              <Text style={styles.infoValue}>{profile?.experience || '-'}</Text>
            </View>
          </View>

          {/* Bank & Statutory Details Section */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconContainer}>
              <Ionicons name="card" size={moderateScale(18)} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Bank & Statutory Details</Text>
          </View>

          <View style={styles.infoGrid}>
            <View style={styles.infoCard}>
              <Ionicons name="card-outline" size={moderateScale(20)} color={Colors.success} />
              <Text style={styles.infoLabel}>Bank Account No.</Text>
              <Text style={styles.infoValue}>{profile?.accountNo || '-'}</Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="shield-checkmark-outline" size={moderateScale(20)} color={Colors.success} />
              <Text style={styles.infoLabel}>PF Number</Text>
              <Text style={styles.infoValue}>{profile?.pfNo || '-'}</Text>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="medkit-outline" size={moderateScale(20)} color={Colors.success} />
              <Text style={styles.infoLabel}>ESIC Number</Text>
              <Text style={styles.infoValue}>{profile?.esicNo || '-'}</Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving || isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={Colors.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              {isSaving ? (
                <Text style={styles.saveButtonText}>Saving...</Text>
              ) : (
                <>
                  <Ionicons name="save-outline" size={moderateScale(18)} color={Colors.white} style={{ marginRight: moderateScale(8) }} />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Image Picker Bottom Sheet */}
      <Modal
        visible={isBottomSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsBottomSheetVisible(false)}
      >
        <TouchableOpacity
          style={styles.bottomSheetOverlay}
          activeOpacity={1}
          onPress={() => setIsBottomSheetVisible(false)}
        >
          <View style={styles.bottomSheetContent}>
            <View style={styles.bottomSheetHandle} />
            <TouchableOpacity
              style={styles.bottomSheetCloseBtn}
              activeOpacity={0.7}
              onPress={() => setIsBottomSheetVisible(false)}
            >
              <Ionicons name="close" size={moderateScale(22)} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.bottomSheetTitle}>Change Profile Photo</Text>
            <TouchableOpacity
              style={styles.bottomSheetOption}
              onPress={() => handleSheetAction(openCamera)}
            >
              <Ionicons name="camera" size={moderateScale(24)} color={Colors.primary} />
              <Text style={styles.bottomSheetOptionText}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.bottomSheetOption}
              onPress={() => handleSheetAction(openGallery)}
            >
              <Ionicons name="images" size={moderateScale(24)} color={Colors.primary} />
              <Text style={styles.bottomSheetOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom DOB Calendar Modal */}
      <Modal
        visible={isDobCalendarOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsDobCalendarOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsDobCalendarOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { maxHeight: '80%' }]}
          >
            <Text style={styles.modalTitle}>Select Date of Birth</Text>
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeaderRow}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-back" size={20} color="#0F172A" />
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowYearSelector(!showYearSelector)}
                  style={styles.calendarHeaderCenter}
                >
                  <Text style={styles.calendarMonthYearText}>
                    {CALENDAR_MONTHS[currentCalendarMonth]} {currentCalendarYear}
                  </Text>
                  <Ionicons name={showYearSelector ? "chevron-up" : "chevron-down"} size={16} color="#0F172A" style={{ marginLeft: 4 }} />
                </TouchableOpacity>

                <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-forward" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>

              {showYearSelector ? (
                <ScrollView
                  style={styles.yearListContainer}
                  contentContainerStyle={styles.yearListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.yearItem,
                        year === currentCalendarYear && styles.yearItemActive
                      ]}
                      onPress={() => {
                        setCurrentCalendarYear(year);
                        setShowYearSelector(false);
                      }}
                    >
                      <Text style={[
                        styles.yearItemText,
                        year === currentCalendarYear && styles.yearItemTextActive
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <>
                  <View style={styles.weekdaysRow}>
                    {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(dayName => (
                      <Text key={dayName} style={styles.weekdayText}>{dayName}</Text>
                    ))}
                  </View>
                  <View style={styles.daysGrid}>
                    {calendarDaysGrid.map((dayObj, gridIdx) => {
                      const isSelected = dayObj.dateString === dob;
                      const isCurrentMonth = dayObj.month === currentCalendarMonth;
                      const isToday = dayObj.isToday;

                      return (
                        <TouchableOpacity
                          key={gridIdx}
                          style={[
                            styles.dayCell,
                            isSelected && styles.dayCellSelected,
                            !isCurrentMonth && styles.dayCellInactive,
                          ]}
                          onPress={() => dayObj.dateString && handleSelectDate(dayObj.dateString)}
                          disabled={!dayObj.dateString}
                        >
                          {isSelected ? (
                            <View style={styles.daySelectedDot}>
                              <Text style={styles.dayCellTextSelected}>{dayObj.day}</Text>
                            </View>
                          ) : (
                            <Text style={[
                              styles.dayCellText,
                              isToday && styles.dayCellTextToday,
                              !isCurrentMonth && styles.dayCellTextInactive
                            ]}>
                              {dayObj.day}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerContainer: {
    position: 'relative',
    paddingTop: Theme.spacing.md,
    paddingBottom: moderateScale(32),
    paddingHorizontal: Theme.spacing.lg,
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: moderateScale(200),
    overflow: 'hidden',
    zIndex: -1,
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
    backgroundColor: 'rgba(254, 0, 0, 0.1)',
    filter: 'blur(50px)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    zIndex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Theme.spacing.md,
  },
  avatarCircle: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
    borderWidth: 3,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarDisabled: {
    opacity: 0.5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarInitialsContainer: {
    backgroundColor: Colors.primaryGradient[0],
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    ...Typography.heading,
    fontSize: moderateScale(40),
    color: Colors.white,
    fontWeight: '700' as const,
  },
  editAvatarBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  headerText: {
    flex: 1,
  },
  headerName: {
    ...Typography.heading,
    fontSize: moderateScale(24),
    color: Colors.text,
    fontWeight: '700' as const,
    marginBottom: moderateScale(4),
  },
  headerId: {
    ...Typography.caption,
    fontSize: moderateScale(14),
    color: Colors.textMuted,
    marginBottom: moderateScale(8),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: Theme.borderRadius.pill,
    alignSelf: 'flex-start',
  },
  statusText: {
    ...Typography.label,
    fontSize: moderateScale(11),
    color: Colors.success,
    fontWeight: '600' as const,
    marginLeft: moderateScale(4),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    marginHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    gap: Theme.spacing.sm,
  },
  errorText: {
    ...Typography.caption,
    fontSize: moderateScale(13),
    color: Colors.error,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: moderateScale(120),
  },
  formContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: moderateScale(28),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: moderateScale(4),
  },
  sectionIconContainer: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(8),
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
    fontWeight: '700' as const,
  },
  inputGroup: {
    gap: Theme.spacing.sm,
  },
  inputCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Theme.shadow.sm,
  },
  inputCardFocused: {
    borderColor: Colors.primary,
    borderWidth: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Theme.spacing.sm,
  },
  inputIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: moderateScale(2),
  },
  inputContent: {
    flex: 1,
  },
  inputLabel: {
    ...Typography.caption,
    fontSize: moderateScale(11),
    color: Colors.textMuted,
    marginBottom: moderateScale(4),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputLabelFocused: {
    color: Colors.primary,
  },
  inputField: {
    ...Typography.body,
    fontSize: moderateScale(15),
    color: Colors.text,
    paddingVertical: moderateScale(4),
  },
  textArea: {
    minHeight: moderateScale(72),
    textAlignVertical: 'top',
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  infoCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Theme.shadow.sm,
    gap: Theme.spacing.xs,
  },
  infoLabel: {
    ...Typography.caption,
    fontSize: moderateScale(10),
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  infoValue: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.text,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  saveButton: {
    marginTop: moderateScale(8),
    borderRadius: Theme.borderRadius.lg,
    overflow: 'hidden',
    ...Theme.shadow.md,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonGradient: {
    paddingVertical: moderateScale(18),
    paddingHorizontal: Theme.spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    ...Typography.label,
    fontSize: moderateScale(16),
    color: Colors.white,
    fontWeight: '700' as const,
  },
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheetContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Theme.borderRadius.xxl,
    borderTopRightRadius: Theme.borderRadius.xxl,
    padding: Theme.spacing.lg,
    paddingBottom: moderateScale(32),
  },
  bottomSheetHandle: {
    width: moderateScale(40),
    height: moderateScale(4),
    backgroundColor: Colors.borderStrong,
    borderRadius: moderateScale(2),
    alignSelf: 'center',
    marginBottom: Theme.spacing.lg,
  },
  bottomSheetTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
    textAlign: 'center',
    marginBottom: Theme.spacing.lg,
  },
  bottomSheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  bottomSheetOptionText: {
    ...Typography.body,
    fontSize: moderateScale(16),
    color: Colors.text,
    marginLeft: Theme.spacing.md,
  },
  bottomSheetCloseBtn: {
    position: 'absolute',
    top: Theme.spacing.md,
    right: Theme.spacing.md,
    width: moderateScale(30),
    height: moderateScale(30),
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xxl,
    padding: Theme.spacing.md,
    width: '100%',
    maxWidth: moderateScale(320),
    shadowColor: 'rgba(15, 23, 42, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 4,
  },
  modalTitle: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
    marginBottom: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: moderateScale(6),
    textAlign: 'center',
  },
  calendarContainer: {
    gap: moderateScale(10),
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: moderateScale(6),
  },
  calendarHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(4),
    paddingHorizontal: moderateScale(8),
    borderRadius: moderateScale(8),
    backgroundColor: '#F1F5F9',
  },
  monthNavBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthYearText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: '#0F172A',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: moderateScale(4),
  },
  weekdayText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(11),
    color: Colors.textMuted,
    width: '14.28%',
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  dayCell: {
    width: '14.28%',
    height: moderateScale(36),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(8),
  },
  dayCellSelected: {
    backgroundColor: '#FF4D1C',
  },
  daySelectedDot: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FF4D1C',
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellInactive: {
    opacity: 0.35,
  },
  dayCellText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(12),
    color: '#0F172A',
  },
  dayCellTextSelected: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: '#FFFFFF',
  },
  dayCellTextToday: {
    color: '#FF4D1C',
    textDecorationLine: 'underline',
    fontWeight: '800',
  },
  dayCellTextInactive: {
    color: '#94A3B8',
  },
  yearListContainer: {
    height: moderateScale(220),
  },
  yearListContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: moderateScale(8),
    paddingVertical: moderateScale(8),
  },
  yearItem: {
    paddingVertical: moderateScale(6),
    paddingHorizontal: moderateScale(12),
    borderRadius: moderateScale(8),
    backgroundColor: '#F1F5F9',
    minWidth: '22%',
    alignItems: 'center',
  },
  yearItemActive: {
    backgroundColor: '#FF4D1C',
  },
  yearItemText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(13),
    color: '#0F172A',
  },
  yearItemTextActive: {
    color: '#FFFFFF',
  },
});

export default PersonalDetailsScreen;

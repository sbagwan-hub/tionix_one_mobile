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

      {/* Stunning Background Banner */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(254, 0, 0, 0.15)', 'rgba(254, 0, 0, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      <View style={styles.profileHeaderContent}>
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.avatarWrapper}
            onPress={showImagePickerOptions}
          >
            <View style={styles.avatar}>
              {profileImageUrl && !avatarImageError ? (
                <Image
                  source={{ uri: getFullImageUrl(profileImageUrl) || undefined }}
                  style={styles.avatarImage}
                  onError={() => setAvatarImageError(true)}
                />
              ) : (
                <Text style={styles.avatarText}>{initials}</Text>
              )}
            </View>
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={moderateScale(14)} color={Colors.white} />
            </View>
          </TouchableOpacity>
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.name} numberOfLines={1}>{userName || 'Employee'}</Text>
            <View style={styles.employeeBadge}>
              <Text style={styles.employeeId}>
                {profile?.empCode ? `ID: ${profile.empCode}` : (profile?.fkEmpId ? `ID: ${profile.fkEmpId}` : 'Update profile')}
              </Text>
            </View>
          </View>
        </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Personal Details</Text>

          {/* Floating Pill Inputs */}
          <View style={[styles.pillInputContainer, isNameFocused && styles.pillInputFocused]}>
            <View style={[styles.pillIcon, isNameFocused && styles.pillIconFocused]}>
              <Ionicons name="person-outline" size={moderateScale(20)} color={isNameFocused ? Colors.primary : Colors.textMuted} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>Full Name</Text>
              <TextInput
                value={userName}
                onChangeText={setUserName}
                placeholder="Enter full name"
                placeholderTextColor={Colors.borderStrong}
                style={styles.pillInput}
                editable={!isLoading && !isSaving}
                onFocus={() => setIsNameFocused(true)}
                onBlur={() => setIsNameFocused(false)}
              />
            </View>
          </View>

          <View style={[styles.pillInputContainer, isEmailFocused && styles.pillInputFocused]}>
            <View style={[styles.pillIcon, isEmailFocused && styles.pillIconFocused]}>
              <Ionicons name="mail-outline" size={moderateScale(20)} color={isEmailFocused ? Colors.primary : Colors.textMuted} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>Email Address</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                placeholderTextColor={Colors.borderStrong}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.pillInput}
                editable={!isLoading && !isSaving}
                onFocus={() => setIsEmailFocused(true)}
                onBlur={() => setIsEmailFocused(false)}
              />
            </View>
          </View>

          <View style={[styles.pillInputContainer, isPhoneFocused && styles.pillInputFocused]}>
            <View style={[styles.pillIcon, isPhoneFocused && styles.pillIconFocused]}>
              <Ionicons name="call-outline" size={moderateScale(20)} color={isPhoneFocused ? Colors.primary : Colors.textMuted} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>Phone Number</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={Colors.borderStrong}
                keyboardType="phone-pad"
                style={styles.pillInput}
                editable={!isLoading && !isSaving}
                onFocus={() => setIsPhoneFocused(true)}
                onBlur={() => setIsPhoneFocused(false)}
              />
            </View>
          </View>

          <View style={[styles.pillInputContainer, isDobFocused && styles.pillInputFocused]}>
            <View style={[styles.pillIcon, isDobFocused && styles.pillIconFocused]}>
              <Ionicons name="calendar-outline" size={moderateScale(20)} color={isDobFocused ? Colors.primary : Colors.textMuted} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>Date of Birth (YYYY-MM-DD)</Text>
              <TextInput
                value={dob}
                onChangeText={setDob}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={Colors.borderStrong}
                style={styles.pillInput}
                editable={!isLoading && !isSaving}
                onFocus={() => setIsDobFocused(true)}
                onBlur={() => setIsDobFocused(false)}
              />
            </View>
          </View>

          <View style={[styles.pillInputContainer, isBloodGroupFocused && styles.pillInputFocused]}>
            <View style={[styles.pillIcon, isBloodGroupFocused && styles.pillIconFocused]}>
              <Ionicons name="water-outline" size={moderateScale(20)} color={isBloodGroupFocused ? Colors.primary : Colors.textMuted} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>Blood Group</Text>
              <TextInput
                value={bloodGroup}
                onChangeText={setBloodGroup}
                placeholder="Enter blood group"
                placeholderTextColor={Colors.borderStrong}
                style={styles.pillInput}
                editable={!isLoading && !isSaving}
                onFocus={() => setIsBloodGroupFocused(true)}
                onBlur={() => setIsBloodGroupFocused(false)}
              />
            </View>
          </View>

          <View style={[styles.infoPill, { marginBottom: 16 }]}>
            <View style={styles.infoPillIcon}>
              <Ionicons name="male-female-outline" size={moderateScale(22)} color={Colors.primary} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>Gender</Text>
              <Text style={styles.infoPillValue}>{profile?.gender || '-'}</Text>
            </View>
          </View>

          <View style={[styles.infoPill, { marginBottom: 16 }]}>
            <View style={styles.infoPillIcon}>
              <Ionicons name="heart-outline" size={moderateScale(22)} color={Colors.primary} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>Marital Status</Text>
              <Text style={styles.infoPillValue}>{profile?.maritalStatus || '-'}</Text>
            </View>
          </View>

          <View style={[styles.pillInputContainer, isPresentAddressFocused && styles.pillInputFocused]}>
            <View style={[styles.pillIcon, isPresentAddressFocused && styles.pillIconFocused]}>
              <Ionicons name="location-outline" size={moderateScale(20)} color={isPresentAddressFocused ? Colors.primary : Colors.textMuted} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>Present Address</Text>
              <TextInput
                value={presentAddress}
                onChangeText={setPresentAddress}
                placeholder="Enter present address"
                placeholderTextColor={Colors.borderStrong}
                style={styles.pillInput}
                editable={!isLoading && !isSaving}
                onFocus={() => setIsPresentAddressFocused(true)}
                onBlur={() => setIsPresentAddressFocused(false)}
              />
            </View>
          </View>

          <View style={[styles.pillInputContainer, isPermanentAddressFocused && styles.pillInputFocused]}>
            <View style={[styles.pillIcon, isPermanentAddressFocused && styles.pillIconFocused]}>
              <Ionicons name="home-outline" size={moderateScale(20)} color={isPermanentAddressFocused ? Colors.primary : Colors.textMuted} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>Permanent Address</Text>
              <TextInput
                value={permanentAddress}
                onChangeText={setPermanentAddress}
                placeholder="Enter permanent address"
                placeholderTextColor={Colors.borderStrong}
                style={styles.pillInput}
                editable={!isLoading && !isSaving}
                onFocus={() => setIsPermanentAddressFocused(true)}
                onBlur={() => setIsPermanentAddressFocused(false)}
              />
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Employee Details</Text>
          <View style={[styles.infoPill, { marginBottom: 12 }]}>
            <View style={styles.infoPillIcon}>
              <Ionicons name="id-card-outline" size={moderateScale(22)} color={Colors.primary} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>User ID</Text>
              <Text style={styles.infoPillValue}>{profile?.pkUserId || '-'}</Text>
            </View>
          </View>
          {profile?.empCode ? (
            <View style={[styles.infoPill, { marginBottom: 12 }]}>
              <View style={styles.infoPillIcon}>
                <Ionicons name="barcode-outline" size={moderateScale(22)} color={Colors.primary} />
              </View>
              <View style={styles.pillInputWrapper}>
                <Text style={styles.pillLabel}>Employee Code</Text>
                <Text style={styles.infoPillValue}>{profile.empCode}</Text>
              </View>
            </View>
          ) : null}
          <View style={[styles.infoPill, { marginBottom: 12 }]}>
            <View style={styles.infoPillIcon}>
              <Ionicons name="calendar-outline" size={moderateScale(22)} color={Colors.primary} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>Date of Joining</Text>
              <Text style={styles.infoPillValue}>{dojDisplay}</Text>
            </View>
          </View>
          <View style={[styles.infoPill, { marginBottom: 12 }]}>
            <View style={styles.infoPillIcon}>
              <Ionicons name="git-branch-outline" size={moderateScale(22)} color={Colors.primary} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>Employment Type</Text>
              <Text style={styles.infoPillValue}>{profile?.employmentType || '-'}</Text>
            </View>
          </View>
          <View style={[styles.infoPill, { marginBottom: 12 }]}>
            <View style={styles.infoPillIcon}>
              <Ionicons name="time-outline" size={moderateScale(22)} color={Colors.primary} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>Experience</Text>
              <Text style={styles.infoPillValue}>{profile?.experience || '-'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Statutory & Bank Details</Text>
          <View style={[styles.infoPill, { marginBottom: 12 }]}>
            <View style={styles.infoPillIcon}>
              <Ionicons name="cash-outline" size={moderateScale(22)} color={Colors.primary} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>Bank Account No.</Text>
              <Text style={styles.infoPillValue}>{profile?.accountNo || '-'}</Text>
            </View>
          </View>
          <View style={[styles.infoPill, { marginBottom: 12 }]}>
            <View style={styles.infoPillIcon}>
              <Ionicons name="business-outline" size={moderateScale(22)} color={Colors.primary} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>PF Number</Text>
              <Text style={styles.infoPillValue}>{profile?.pfNo || '-'}</Text>
            </View>
          </View>
          <View style={[styles.infoPill, { marginBottom: 12 }]}>
            <View style={styles.infoPillIcon}>
              <Ionicons name="shield-checkmark-outline" size={moderateScale(22)} color={Colors.primary} />
            </View>
            <View style={styles.pillInputWrapper}>
              <Text style={styles.pillLabel}>ESIC Number</Text>
              <Text style={styles.infoPillValue}>{profile?.esicNo || '-'}</Text>
            </View>
          </View>
        </View>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={moderateScale(20)} color={Colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Floating Action Button */}
      <View style={styles.stickyFooter}>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', 'rgba(255,255,255,1)']}
          style={styles.stickyFooterGradient}
        />
        <TouchableOpacity
          style={styles.floatingSaveButton}
          onPress={handleSave}
          disabled={isLoading || isSaving}
          activeOpacity={0.8}
        >
          <Text style={styles.floatingSaveText}>
            {isLoading ? 'Loading...' : isSaving ? 'Saving...' : 'Save Details'}
          </Text>
          <Ionicons name="checkmark-circle" size={moderateScale(20)} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <Modal
        visible={isBottomSheetVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsBottomSheetVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setIsBottomSheetVisible(false)} 
          />
          <View style={styles.bottomSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Update Profile Photo</Text>
            
            <TouchableOpacity style={styles.sheetOption} onPress={() => handleSheetAction(openCamera)}>
              <View style={styles.sheetIconBox}>
                <Ionicons name="camera-outline" size={moderateScale(24)} color={Colors.primary} />
              </View>
              <Text style={styles.sheetOptionText}>Take a photo</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetOption} onPress={() => handleSheetAction(openGallery)}>
              <View style={styles.sheetIconBox}>
                <Ionicons name="image-outline" size={moderateScale(24)} color={Colors.primary} />
              </View>
              <Text style={styles.sheetOptionText}>Choose from gallery</Text>
            </TouchableOpacity>

            {profileImageUrl ? (
              <TouchableOpacity style={styles.sheetOption} onPress={() => handleSheetAction(() => setProfileImageUrl(null))}>
                <View style={[styles.sheetIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                  <Ionicons name="trash-outline" size={moderateScale(24)} color={Colors.error} />
                </View>
                <Text style={styles.sheetOptionDanger}>Remove photo</Text>
              </TouchableOpacity>
            ) : null}

          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
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
    height: moderateScale(260),
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
    backgroundColor: 'rgba(254, 0, 0, 0.1)',
    filter: 'blur(50px)',
  },
  header: {
    zIndex: 10,
    paddingBottom: Theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    width: '100%',
  },
  backButton: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    ...Theme.shadow.floating,
    shadowOpacity: 0.08,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  headerSpacer: {
    width: moderateScale(44),
  },
  scrollContent: {
    paddingTop: moderateScale(16),
    paddingBottom: moderateScale(160),
  },
  profileHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: moderateScale(12),
    backgroundColor: 'rgba(255,255,255,0.85)',
    marginHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.sm,
    marginBottom: moderateScale(8),
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,1)',
    ...Theme.shadow.sm,
    shadowOpacity: 0.04,
  },
  avatarWrapper: {
    position: 'relative',
    marginRight: Theme.spacing.md,
  },
  avatar: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(32),
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    ...Typography.heading,
    fontSize: moderateScale(24),
    color: Colors.primary,
  },
  cameraBadge: {
    position: 'absolute',
    right: -moderateScale(2),
    bottom: -moderateScale(2),
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  headerTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    ...Typography.heading,
    color: Colors.text,
    fontSize: moderateScale(20),
    letterSpacing: -0.5,
    marginBottom: moderateScale(4),
  },
  employeeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(254, 0, 0, 0.08)',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: Theme.borderRadius.md,
  },
  employeeId: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  formSection: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: moderateScale(28),
  },
  sectionTitle: {
    ...Typography.label,
    fontSize: moderateScale(13),
    color: Colors.textMuted,
    marginLeft: moderateScale(8),
    marginBottom: moderateScale(12),
    letterSpacing: 1.2,
  },
  pillInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xxl,
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(8),
    marginBottom: moderateScale(16),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    ...Theme.shadow.floating,
    shadowOpacity: 0.03,
    shadowRadius: 10,
  },
  pillInputFocused: {
    borderColor: 'rgba(254, 0, 0, 0.2)',
    shadowOpacity: 0.08,
    shadowColor: Colors.primary,
    backgroundColor: '#FFFAFA',
  },
  pillIcon: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(0,0,0,0.02)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(12),
  },
  pillIconFocused: {
    backgroundColor: 'rgba(254, 0, 0, 0.1)',
  },
  pillInputWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  pillLabel: {
    ...Typography.label,
    fontSize: moderateScale(10),
    color: Colors.textMuted,
    marginBottom: moderateScale(2),
  },
  pillInput: {
    padding: 0,
    fontSize: moderateScale(16),
    fontFamily: 'Outfit-SemiBold',
    color: Colors.text,
    height: moderateScale(24),
  },
  infoPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(254, 0, 0, 0.04)',
    borderRadius: Theme.borderRadius.xxl,
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(8),
    borderWidth: 1,
    borderColor: 'rgba(254, 0, 0, 0.1)',
  },
  infoPillIcon: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(10),
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(12),
    ...Theme.shadow.sm,
    shadowOpacity: 0.05,
  },
  infoPillValue: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.primary,
    marginTop: moderateScale(2),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Theme.spacing.lg,
    padding: moderateScale(16),
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: Theme.borderRadius.xl,
    gap: moderateScale(12),
  },
  errorText: {
    ...Typography.body,
    flex: 1,
    color: Colors.error,
    fontSize: moderateScale(14),
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? moderateScale(32) : moderateScale(24),
    paddingTop: moderateScale(32),
  },
  stickyFooterGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
  },
  floatingSaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Theme.borderRadius.pill,
    height: moderateScale(60),
    gap: moderateScale(12),
    ...Theme.shadow.floating,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  floatingSaveText: {
    ...Typography.heading,
    fontSize: moderateScale(17),
    color: Colors.white,
    letterSpacing: 0.5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Theme.borderRadius.xxl,
    borderTopRightRadius: Theme.borderRadius.xxl,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: Platform.OS === 'ios' ? moderateScale(40) : Theme.spacing.xxl,
    ...Theme.shadow.floating,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  sheetHandle: {
    width: moderateScale(40),
    height: moderateScale(5),
    borderRadius: moderateScale(2.5),
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignSelf: 'center',
    marginBottom: Theme.spacing.lg,
  },
  sheetTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
    marginBottom: Theme.spacing.lg,
    textAlign: 'center',
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(16),
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.04)',
  },
  sheetIconBox: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(254, 0, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  sheetOptionText: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
  },
  sheetOptionDanger: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.error,
  },
});

export default PersonalDetailsScreen;

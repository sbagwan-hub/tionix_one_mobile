import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  StyleSheet,
  Image,
  Modal,
} from 'react-native';
import Shimmer from '../../../components/Shimmer';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import AppCard from '../../../components/AppCard';
import { clearAuthSession, logout } from '../../auth/services/auth';
import { EmployeeProfile, getEmployeeProfile } from '../services/profile';
import { getAttendanceHistory } from '../../attendance/services/attendance';
import { API_BASE_URL } from '../../../config/api';
import Toast from 'react-native-toast-message';

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

const menuItems = [
  {
    id: '1',
    title: 'My Attendance',
    subtitle: 'Daily tracking and shift history',
    icon: 'calendar-outline',
    route: 'MyAttendance',
  },
  {
    id: '2',
    title: 'My Leaves',
    subtitle: 'Balance, requests, and history',
    icon: 'calendar-clear-outline',
    route: 'MyLeave',
  },
  {
    id: '3',
    title: 'My Loans & Advances',
    subtitle: 'Active debt and new applications',
    icon: 'cash-outline',
    route: 'MyLoans',
  },
  {
    id: '4',
    title: 'Personal Work',
    subtitle: 'Tasks and personal assignments',
    icon: 'briefcase-outline',
    route: 'MyPersonalWork',
  },
  {
    id: '5',
    title: 'Personal Information',
    subtitle: 'Contact, address, and emergency info',
    icon: 'person-outline',
    route: 'PersonalDetails',
  },
  {
    id: '6',
    title: 'Payroll & Tax Details',
    subtitle: 'Salary history and tax documents',
    icon: 'document-text-outline',
    route: 'AccountSettings',
  },
  {
    id: '7',
    title: 'Security & Biometrics',
    subtitle: 'FaceID and two-factor authentication',
    icon: 'finger-print-outline',
    route: 'AccountSettings',
  },
  {
    id: '8',
    title: 'Notification Settings',
    subtitle: 'Custom alerts and email preferences',
    icon: 'notifications-outline',
    route: 'AccountSettings',
  },
  {
    id: '9',
    title: 'Help & Support',
    subtitle: 'FAQs and direct support tickets',
    icon: 'help-circle-outline',
  },
];

const ProfileScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarImageError, setAvatarImageError] = useState(false);
  const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);
  const [presentDays, setPresentDays] = useState(0);
  const [lateDays, setLateDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const resetToLogin = useCallback(async () => {
    await clearAuthSession();

    const rootNavigation = navigation.getParent?.() ?? navigation;
    rootNavigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadData = async () => {
        if (isActive) {
          setIsLoading(true);
        }
        try {
          await Promise.all([
            (async () => {
              const employeeProfile = await getEmployeeProfile();
              if (isActive) {
                setProfile(employeeProfile);
                setAvatarImageError(false);
                setProfileError(null);
              }
            })(),
            (async () => {
              const historyResponse = await getAttendanceHistory();
              if (historyResponse.success && Array.isArray(historyResponse.data)) {
                let pCount = 0;
                let lCount = 0;
                historyResponse.data.forEach((day: any) => {
                  const inPunch = day.records?.find((r: any) => r.Punch === 'Check IN');
                  if (inPunch) {
                    const dateObj = new Date(inPunch.PunchDatetime);
                    const hours = dateObj.getHours();
                    const minutes = dateObj.getMinutes();
                    const isLate = hours > 9 || (hours === 9 && minutes > 15);
                    if (isLate) {
                      lCount += 1;
                    }
                    pCount += 1;
                  }
                });
                if (isActive) {
                  setPresentDays(pCount);
                  setLateDays(lCount);
                }
              }
            })()
          ]);
        } catch (error) {
          if (isActive) {
            const message =
              error instanceof Error ? error.message : 'Unable to load profile details.';

            if (isInvalidTokenError(message)) {
              resetToLogin();
              return;
            }

            setProfileError(message);
          }
        } finally {
          if (isActive) {
            setIsLoading(false);
          }
        }
      };

      loadData();

      return () => {
        isActive = false;
      };
    }, [resetToLogin]),
  );

  const displayName = profile?.userName || 'Employee';
  const employeeCode = profile?.empCode || (profile?.fkEmpId ? `XN-${profile.fkEmpId}` : 'XN');
  const contactDetails = [profile?.email, profile?.phone].filter(Boolean).join(' | ');
  const designation = (profile as any)?.designation || 'Senior UX Designer';

  // Format dates for display
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const dobDisplay = formatDate(profile?.dob ?? null);
  const dojDisplay = formatDate(profile?.doj ?? null);

  const initials = useMemo(
    () =>
      displayName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part[0])
        .join('')
        .toUpperCase() || 'E',
    [displayName],
  );

  // Calculate attendance percentage
  const attendancePercentage = presentDays > 0 ? Math.round((presentDays / (presentDays + lateDays)) * 100) : 98;

  const handleLogout = () => {
    setIsLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setIsLogoutModalVisible(false);
    try {
      await logout();
      await resetToLogin();
      setTimeout(() => {
        Toast.show({
          type: 'info',
          text1: 'Logged out',
          text2: 'You have been safely signed out.',
          position: 'top',
          topOffset: 60,
        });
      }, 100);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Logout failed',
        text2: 'Please try again.',
        position: 'top',
        topOffset: 60,
      });
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Background Banner */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.15)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      <SafeAreaView edges={['top']} style={styles.header}>
        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <Text style={styles.headerTitle}>Profile</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: moderateScale(120) + insets.bottom }]}
      >
        {/* User Profile Card */}
        <View style={styles.profileCard}>
          <LinearGradient
            colors={['#FF8C00', '#FF4D1C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCardGradient}
          >
            <View style={styles.profileAvatarContainer}>
              {profile?.profileImageUrl && !avatarImageError ? (
                <Image
                  source={{ uri: getFullImageUrl(profile.profileImageUrl) || undefined }}
                  style={styles.profileAvatar}
                  onError={() => setAvatarImageError(true)}
                />
              ) : (
                <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder]}>
                  <Text style={styles.profileAvatarText}>{initials}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.editButton}
                onPress={() => navigation.navigate('PersonalDetails')}
                activeOpacity={0.8}
              >
                <Ionicons name="pencil" size={moderateScale(14)} color={Colors.white} />
              </TouchableOpacity>
            </View>
            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileTitle}>{designation}</Text>
            <View style={styles.idTag}>
              <Text style={styles.idText}>{employeeCode}</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Statistics Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Attendance</Text>
            <Text style={styles.statValue}>{attendancePercentage}%</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Performance</Text>
            <View style={styles.performanceRow}>
              <Text style={styles.statValue}>4.8</Text>
              <Ionicons name="star" size={moderateScale(16)} color={Colors.primary} style={styles.starIcon} />
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Tenure</Text>
            <Text style={styles.statValue}>3.5y</Text>
          </View>
        </View>

        {/* Settings & Information Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Settings & Information</Text>
          <AppCard style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.id}>
                <TouchableOpacity
                  style={styles.menuItemRow}
                  onPress={() => item.route && navigation.navigate(item.route)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuIconWrapper}>
                    <Ionicons name={item.icon as any} size={moderateScale(20)} color={Colors.primary} />
                  </View>
                  <View style={styles.menuCopy}>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                  </View>
                  <View style={styles.menuChevron}>
                    <Ionicons name="chevron-forward" size={moderateScale(16)} color={Colors.textMuted} />
                  </View>
                </TouchableOpacity>
                {index < menuItems.length - 1 && <View style={styles.menuDivider} />}
              </React.Fragment>
            ))}
          </AppCard>
        </View>

        {/* Logout Section */}
        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={moderateScale(20)} color={Colors.error} />
            <Text style={styles.logoutText}>Logout from Xone</Text>
          </TouchableOpacity>
          <Text style={styles.version}>VERSION 4.2.1-KINETIC</Text>
        </View>
      </ScrollView>

      <Modal
        visible={isLogoutModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsLogoutModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={StyleSheet.absoluteFill} 
            activeOpacity={1} 
            onPress={() => setIsLogoutModalVisible(false)} 
          />
          <View style={styles.logoutModalContainer}>
            <View style={styles.logoutIconBox}>
              <Ionicons name="log-out-outline" size={moderateScale(32)} color={Colors.error} />
            </View>
            <Text style={styles.logoutModalTitle}>Log Out</Text>
            <Text style={styles.logoutModalText}>Are you sure you want to log out of your account?</Text>
            
            <View style={styles.logoutModalActions}>
              <TouchableOpacity 
                style={[styles.logoutModalButton, styles.logoutModalCancel]} 
                onPress={() => setIsLogoutModalVisible(false)}
              >
                <Text style={styles.logoutModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.logoutModalButton, styles.logoutModalConfirm]} 
                onPress={confirmLogout}
              >
                <Text style={styles.logoutModalConfirmText}>Log Out</Text>
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
    backgroundColor: 'rgba(254, 0, 0, 0.1)',
    filter: 'blur(50px)',
  },
  header: {
    zIndex: 10,
    paddingBottom: Theme.spacing.md,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  scrollContent: {
    paddingTop: moderateScale(16),
  },
  profileCard: {
    marginHorizontal: Theme.spacing.lg,
    marginBottom: moderateScale(20),
    borderRadius: Theme.borderRadius.xxl,
    overflow: 'hidden',
    ...Theme.shadow.floating,
  },
  profileCardGradient: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
  },
  profileAvatarContainer: {
    marginBottom: Theme.spacing.md,
    position: 'relative',
  },
  profileAvatar: {
    width: moderateScale(80),
    height: moderateScale(80),
    borderRadius: moderateScale(40),
    backgroundColor: Colors.white,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  profileAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarText: {
    ...Typography.heading,
    fontSize: moderateScale(28),
    color: Colors.primary,
  },
  editButton: {
    position: 'absolute',
    right: -moderateScale(4),
    bottom: -moderateScale(4),
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  profileName: {
    ...Typography.heading,
    fontSize: moderateScale(22),
    color: Colors.white,
    marginBottom: Theme.spacing.xs,
  },
  profileTitle: {
    ...Typography.body,
    fontSize: moderateScale(14),
    color: 'rgba(255,255,255,0.9)',
    marginBottom: Theme.spacing.sm,
  },
  idTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(4),
    borderRadius: Theme.borderRadius.pill,
  },
  idText: {
    ...Typography.caption,
    fontSize: moderateScale(12),
    color: Colors.white,
    fontWeight: '700',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: moderateScale(24),
    gap: Theme.spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingVertical: moderateScale(16),
    paddingHorizontal: moderateScale(12),
    borderRadius: Theme.borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Theme.shadow.sm,
  },
  statLabel: {
    ...Typography.caption,
    fontSize: moderateScale(10),
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: Theme.spacing.xs,
    textTransform: 'uppercase',
  },
  statValue: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  starIcon: {
    marginTop: moderateScale(2),
  },
  sectionContainer: {
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
    textTransform: 'uppercase',
  },
  menuCard: {
    padding: 0,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.sm,
  },
  menuItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(12),
  },
  menuDivider: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginLeft: moderateScale(66), // aligns nicely after the icon box
    marginRight: Theme.spacing.md,
  },
  menuIconWrapper: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: Theme.borderRadius.md,
    backgroundColor: 'rgba(254, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(14),
  },
  menuCopy: {
    flex: 1,
  },
  menuItemTitle: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
  },
  menuItemSubtitle: {
    ...Typography.body,
    fontSize: moderateScale(12),
    color: Colors.textMuted,
    marginTop: moderateScale(1),
  },
  menuChevron: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(6),
    backgroundColor: 'rgba(0,0,0,0.01)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerContainer: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: moderateScale(12),
    alignItems: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: moderateScale(16),
    gap: moderateScale(10),
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  logoutText: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.error,
  },
  version: {
    ...Typography.caption,
    marginTop: moderateScale(20),
    letterSpacing: 2,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    paddingBottom: moderateScale(20),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.lg,
  },
  logoutModalContainer: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    width: '100%',
    maxWidth: moderateScale(340),
    alignItems: 'center',
    ...Theme.shadow.floating,
    shadowOpacity: 0.15,
  },
  logoutIconBox: {
    width: moderateScale(64),
    height: moderateScale(64),
    borderRadius: moderateScale(32),
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  logoutModalTitle: {
    ...Typography.heading,
    fontSize: moderateScale(22),
    color: Colors.text,
    marginBottom: Theme.spacing.sm,
  },
  logoutModalText: {
    ...Typography.body,
    fontSize: moderateScale(15),
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Theme.spacing.xl,
    paddingHorizontal: Theme.spacing.sm,
  },
  logoutModalActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    width: '100%',
  },
  logoutModalButton: {
    flex: 1,
    height: moderateScale(50),
    borderRadius: Theme.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutModalCancel: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  logoutModalConfirm: {
    backgroundColor: Colors.error,
    ...Theme.shadow.sm,
    shadowColor: Colors.error,
  },
  logoutModalCancelText: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
  },
  logoutModalConfirmText: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.white,
  },
  detailsCard: {
    padding: 0,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(12),
  },
  detailDivider: {
    height: 0.5,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginLeft: moderateScale(60),
    marginRight: Theme.spacing.md,
  },
  detailIconWrapper: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: Theme.borderRadius.md,
    backgroundColor: 'rgba(254, 0, 0, 0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(12),
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    ...Typography.label,
    fontSize: moderateScale(10),
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: moderateScale(2),
  },
  detailValue: {
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.text,
  },
});

export default ProfileScreen;

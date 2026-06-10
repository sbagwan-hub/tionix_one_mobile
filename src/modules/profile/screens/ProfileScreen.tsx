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
    title: 'Personal details',
    subtitle: 'View and update your profile',
    icon: 'person-outline',
    route: 'PersonalDetails',
  },
  {
    id: '2',
    title: 'My attendance',
    subtitle: 'Monthly history and summaries',
    icon: 'calendar-outline',
    route: 'MyAttendance',
  },
  {
    id: '3',
    title: 'My leave',
    subtitle: 'Leave history and request status',
    icon: 'calendar-clear-outline',
    route: 'MyLeave',
  },
  {
    id: '4',
    title: 'Account settings',
    subtitle: 'Security and preferences',
    icon: 'settings-outline',
    route: 'AccountSettings',
  },
  {
    id: '5',
    title: 'Help center',
    subtitle: 'FAQ and support',
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

      const loadProfile = async () => {
        try {
          const employeeProfile = await getEmployeeProfile();

          if (isActive) {
            setProfile(employeeProfile);
            setAvatarImageError(false);
            setProfileError(null);
          }
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
        }
      };

      const loadStats = async () => {
        try {
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
        } catch (err) {
          console.warn('Failed to load stats for profile:', err);
        }
      };

      loadProfile();
      loadStats();

      return () => {
        isActive = false;
      };
    }, [resetToLogin]),
  );

  const displayName = profile?.userName || 'Employee';
  const employeeCode = profile?.empCode || (profile?.fkEmpId ? `EMP-${profile.fkEmpId}` : 'EMP');
  const contactDetails = [profile?.email, profile?.phone].filter(Boolean).join(' | ');
  
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

      {/* Stunning Background Banner */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(254, 0, 0, 0.15)', 'rgba(254, 0, 0, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      <SafeAreaView edges={['top']} style={styles.header}>
        {/* Floating Header */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Account</Text>
        </View>

        <View style={styles.profileHeaderContent}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarRing}>
              <View style={styles.avatar}>
                {profile?.profileImageUrl && !avatarImageError ? (
                  <Image
                    source={{ uri: getFullImageUrl(profile.profileImageUrl) || undefined }}
                    style={styles.avatarImage}
                    onError={() => setAvatarImageError(true)}
                  />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => navigation.navigate('PersonalDetails')}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={moderateScale(12)} color={Colors.white} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.headerTextContainer}>
            <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
            <Text style={styles.role} numberOfLines={1}>{contactDetails || 'Profile details'}</Text>
            <View style={styles.employeeBadge}>
              <Text style={styles.employeeBadgeText}>{employeeCode}</Text>
            </View>
            {profileError ? <Text style={styles.profileError}>{profileError}</Text> : null}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: moderateScale(120) + insets.bottom }]}
      >
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsRow}>
            <View style={styles.floatingStatCard}>
              <View style={styles.statIconFrame}>
                <Ionicons name="checkmark-circle" size={moderateScale(20)} color={Colors.success} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>PRESENT</Text>
                <Text style={styles.statValue}>
                  {String(presentDays).padStart(2, '0')} {presentDays === 1 ? 'Day' : 'Days'}
                </Text>
              </View>
            </View>

            <View style={styles.floatingStatCard}>
              <View style={[styles.statIconFrame, { backgroundColor: 'rgba(255, 179, 0, 0.1)' }]}>
                <Ionicons name="alert-circle" size={moderateScale(20)} color={Colors.accent} />
              </View>
              <View style={styles.statTextContainer}>
                <Text style={styles.statLabel}>LATE PUNCH</Text>
                <Text style={styles.statValue}>
                  {String(lateDays).padStart(2, '0')} {lateDays === 1 ? 'Day' : 'Days'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Employee Details</Text>
          <AppCard style={styles.detailsCard}>
            {dobDisplay && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Ionicons name="calendar-outline" size={moderateScale(16)} color={Colors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Date of Birth</Text>
                  <Text style={styles.detailValue}>{dobDisplay}</Text>
                </View>
              </View>
            )}
            {dojDisplay && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Ionicons name="briefcase-outline" size={moderateScale(16)} color={Colors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Date of Joining</Text>
                  <Text style={styles.detailValue}>{dojDisplay}</Text>
                </View>
              </View>
            )}
            {profile?.bloodGroup && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Ionicons name="water-outline" size={moderateScale(16)} color={Colors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Blood Group</Text>
                  <Text style={styles.detailValue}>{profile.bloodGroup}</Text>
                </View>
              </View>
            )}
            {profile?.aadhar && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Ionicons name="card-outline" size={moderateScale(16)} color={Colors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Aadhar Number</Text>
                  <Text style={styles.detailValue}>{profile.aadhar}</Text>
                </View>
              </View>
            )}
            {profile?.panNo && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Ionicons name="document-text-outline" size={moderateScale(16)} color={Colors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>PAN Number</Text>
                  <Text style={styles.detailValue}>{profile.panNo}</Text>
                </View>
              </View>
            )}
            {profile?.permanentAddress && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Ionicons name="home-outline" size={moderateScale(16)} color={Colors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Permanent Address</Text>
                  <Text style={styles.detailValue}>{profile.permanentAddress}</Text>
                </View>
              </View>
            )}
            {profile?.presentAddress && (
              <View style={styles.detailRow}>
                <View style={styles.detailIconWrapper}>
                  <Ionicons name="location-outline" size={moderateScale(16)} color={Colors.primary} />
                </View>
                <View style={styles.detailTextContainer}>
                  <Text style={styles.detailLabel}>Present Address</Text>
                  <Text style={styles.detailValue}>{profile.presentAddress}</Text>
                </View>
              </View>
            )}
          </AppCard>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Account Services</Text>
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

        <View style={styles.footerContainer}>
          <TouchableOpacity
            style={styles.floatingLogoutPill}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={moderateScale(20)} color={Colors.error} />
            <Text style={styles.logoutText}>Log Out Securely</Text>
          </TouchableOpacity>
          <Text style={styles.version}>Attendance v1.0.2</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    width: '100%',
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  scrollContent: {
    paddingTop: moderateScale(16),
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
  avatarRing: {
    width: moderateScale(76),
    height: moderateScale(76),
    borderRadius: moderateScale(38),
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: moderateScale(68),
    height: moderateScale(68),
    borderRadius: moderateScale(34),
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
    fontSize: moderateScale(26),
    color: Colors.primary,
  },
  editButton: {
    position: 'absolute',
    right: -moderateScale(2),
    bottom: -moderateScale(2),
    width: moderateScale(26),
    height: moderateScale(26),
    borderRadius: moderateScale(13),
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
  },
  role: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: moderateScale(13),
    marginTop: moderateScale(2),
    marginBottom: moderateScale(6),
  },
  employeeBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(254, 0, 0, 0.08)',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: Theme.borderRadius.md,
  },
  employeeBadgeText: {
    ...Typography.caption,
    color: Colors.primary,
    letterSpacing: 1,
    fontWeight: '700',
  },
  profileError: {
    ...Typography.caption,
    color: Colors.error,
    marginTop: Theme.spacing.sm,
    textAlign: 'center',
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
  statsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  floatingStatCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingVertical: moderateScale(16),
    paddingHorizontal: moderateScale(12),
    borderRadius: Theme.borderRadius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.floating,
    shadowOpacity: 0.04,
  },
  statIconFrame: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(10),
  },
  statTextContainer: {
    flex: 1,
  },
  statLabel: {
    ...Typography.label,
    fontSize: moderateScale(10),
    color: Colors.textMuted,
    letterSpacing: 1,
    marginBottom: moderateScale(2),
  },
  statValue: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
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
  floatingLogoutPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: Theme.borderRadius.pill,
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

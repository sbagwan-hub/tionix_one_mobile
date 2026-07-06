import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppCard from '../../../components/AppCard';
import Shimmer from '../../../components/Shimmer';
import AppBar from '../../../components/AppBar';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { downloadReport } from '../../../utils/reportDownloader';
import { getAuthSession } from '../../auth/services/auth';
import { getEmployeeProfile } from '../../profile/services/profile';
import {
  DEFAULT_LEAVE_TYPES,
  getLeaveBalances,
  getLeaveHistory,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from '../services/leave';

const formatDateRange = (startStr: string, endStr: string) => {
  try {
    const startDate = new Date(`${startStr}T00:00:00`);
    const endDate = new Date(`${endStr}T00:00:00`);
    
    if (Number.isNaN(startDate.getTime())) return startStr;

    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = startDate.getDate();
    const startYear = startDate.getFullYear();

    if (startStr === endStr || !endStr) {
      return `${startMonth} ${startDay}, ${startYear}`;
    }

    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const endDay = endDate.getDate();

    return `${startMonth} ${startDay} — ${endMonth} ${endDay}, ${startYear}`;
  } catch {
    return startStr === endStr ? startStr : `${startStr} — ${endStr}`;
  }
};

const BalanceCard = ({ type }: { type: LeaveType }) => {
  const remaining = type.remaining ?? 0;
  const total = type.total ?? 0;
  const used = Math.max(0, total - remaining);
  const progress = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
  const progressPercent = Math.round(progress * 100);

  const cardConfig = useMemo(() => {
    const label = type.label.toLowerCase();
    if (label.includes('annual')) {
      return {
        colors: ['#FF4D1C', '#C22C00'] as const,
        icon: 'airplane-outline',
      };
    }
    if (label.includes('sick')) {
      return {
        colors: ['#3B82F6', '#1D4ED8'] as const,
        icon: 'medkit-outline',
      };
    }
    if (label.includes('casual')) {
      return {
        colors: ['#10B981', '#047857'] as const,
        icon: 'sunny-outline',
      };
    }
    if (label.includes('earned') || label.includes('paid-casual')) {
      return {
        colors: ['#F59E0B', '#B45309'] as const,
        icon: 'ribbon-outline',
      };
    }
    if (label.includes('holiday')) {
      return {
        colors: ['#EC4899', '#BE185D'] as const,
        icon: 'calendar-outline',
      };
    }
    return {
      colors: ['#6366F1', '#4338CA'] as const,
      icon: 'wallet-outline',
    };
  }, [type.label]);

  return (
    <LinearGradient
      colors={cardConfig.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.balanceCardContainer}
    >
      {/* Top Row: Label and Icon */}
      <View style={styles.balanceCardHeader}>
        <Text style={styles.balanceCardLabel} numberOfLines={1}>
          {type.label.toUpperCase()}
        </Text>
        <View style={styles.balanceCardIconFrame}>
          <Ionicons name={cardConfig.icon as any} size={moderateScale(18)} color={Colors.white} />
        </View>
      </View>

      {/* Middle Row: Counter */}
      <Text style={styles.balanceCardValue}>
        {remaining}
        <Text style={styles.balanceCardDaysLabel}> DAYS</Text>
      </Text>

      {/* Bottom Row: Progress and Metrics */}
      <View style={styles.balanceCardFooter}>
        <Text style={styles.balanceCardMetricText}>{progressPercent}% REMAINING</Text>
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.balanceCardBottomRow}>
          <Text style={styles.balanceCardUsedText}>{used} Days Used</Text>
        </View>
      </View>
    </LinearGradient>
  );
};

const HistoryCard = ({ item }: { item: LeaveRequest }) => {
  const tone = useMemo(() => {
    const status = item.status.toLowerCase();
    if (status.includes('approved')) {
      return {
        badgeColor: 'rgba(16, 185, 129, 0.08)',
        textColor: '#10B981',
        iconName: 'checkmark-circle-sharp',
        borderColor: 'rgba(16, 185, 129, 0.2)',
      };
    }
    if (status.includes('pending')) {
      return {
        badgeColor: 'rgba(245, 158, 11, 0.08)',
        textColor: '#F59E0B',
        iconName: 'time-sharp',
        borderColor: 'rgba(245, 158, 11, 0.2)',
      };
    }
    if (status.includes('rejected')) {
      return {
        badgeColor: 'rgba(239, 68, 68, 0.08)',
        textColor: '#EF4444',
        iconName: 'close-circle-sharp',
        borderColor: 'rgba(239, 68, 68, 0.2)',
      };
    }
    return {
      badgeColor: 'rgba(148, 163, 184, 0.08)',
      textColor: '#64748B',
      iconName: 'ban-sharp',
      borderColor: 'rgba(148, 163, 184, 0.2)',
    };
  }, [item.status]);

  const dateRange = formatDateRange(item.startDate, item.endDate);

  return (
    <View style={[styles.historyCardContainer, { borderLeftWidth: moderateScale(4), borderLeftColor: tone.textColor }]}>
      <View style={[styles.historyCardIconBg, { backgroundColor: tone.badgeColor }]}>
        <Ionicons name={tone.iconName as any} size={moderateScale(22)} color={tone.textColor} />
      </View>
      <View style={styles.historyCardContent}>
        <Text style={styles.historyCardTitle}>{item.leaveType}</Text>
        <Text style={styles.historyCardDate}>{dateRange}</Text>
      </View>
      <View style={[styles.historyCardBadge, { borderColor: tone.borderColor, backgroundColor: tone.badgeColor }]}>
        <Text style={[styles.historyCardBadgeText, { color: tone.textColor }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
    </View>
  );
};

const LeaveScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [leaveBalances, setLeaveBalances] = useState(DEFAULT_LEAVE_TYPES);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [isLoadingBalances, setIsLoadingBalances] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeName, setEmployeeName] = useState('Employee');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
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
    } catch {
      // Fallback
    }
  }, []);

  const handleDownloadReport = async () => {
    try {
      const session = await getAuthSession();
      const empId = session?.user?.fkEmpId;
      if (!empId) {
        Alert.alert('Error', 'Employee ID not found in session.');
        return;
      }
      await downloadReport('/api/mobile/leave-requests/report', 'leave_report.pdf', empId);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to download report.');
    }
  };

  const loadLeaveData = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setIsLoadingHistory(true);
      setIsLoadingBalances(true);
    }

    try {
      const [rows, rawBalances] = await Promise.all([getLeaveHistory(), getLeaveBalances()]);
      setHistory(rows);

      let balances = rawBalances;
      if (!balances || balances.length === 0) {
        balances = [
          { id: 'annual', label: 'Annual Leave', icon: 'ribbon-outline', remaining: 0, total: 0 },
          { id: 'paid-holiday', label: 'Paid Holiday', icon: 'calendar-outline', remaining: 0, total: 0 },
          { id: 'sick', label: 'Sick Leave', icon: 'medkit-outline', remaining: 0, total: 0 },
          { id: 'paid-casual', label: 'Paid Casual Leave', icon: 'sunny-outline', remaining: 0, total: 0 },
          { id: 'unpaid-casual', label: 'Unpaid Casual Leave', icon: 'wallet-outline', remaining: 0, total: 0 },
        ];
      } else {
        balances = balances.map(b => ({
          ...b,
          remaining: b.remaining ?? 0,
          total: b.total ?? 0,
        }));
      }
      setLeaveBalances(balances);
    } catch {
      setHistory([]);
      setLeaveBalances([
        { id: 'annual', label: 'Annual Leave', icon: 'ribbon-outline', remaining: 0, total: 0 },
        { id: 'paid-holiday', label: 'Paid Holiday', icon: 'calendar-outline', remaining: 0, total: 0 },
        { id: 'sick', label: 'Sick Leave', icon: 'medkit-outline', remaining: 0, total: 0 },
        { id: 'paid-casual', label: 'Paid Casual Leave', icon: 'sunny-outline', remaining: 0, total: 0 },
        { id: 'unpaid-casual', label: 'Unpaid Casual Leave', icon: 'wallet-outline', remaining: 0, total: 0 },
      ]);
    } finally {
      setIsLoadingHistory(false);
      setIsLoadingBalances(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      loadLeaveData();
    }, [fetchProfile, loadLeaveData]),
  );

  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      const unsubscribe = parent.addListener('focus', () => {
        loadLeaveData(true);
      });
      return unsubscribe;
    }
  }, [navigation, loadLeaveData]);

  const userInitials = useMemo(() => {
    if (!employeeName) return 'EM';
    const parts = employeeName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return employeeName.slice(0, 2).toUpperCase();
  }, [employeeName]);

  const welcomeName = useMemo(() => {
    if (!employeeName) return 'ALEX';
    return employeeName.trim().split(/\s+/)[0].toUpperCase();
  }, [employeeName]);

  const openApplyLeave = () => {
    const rootNavigation = navigation.getParent?.() ?? navigation;
    rootNavigation.navigate('ApplyLeave');
  };

  const viewAllRequests = () => {
    const rootNavigation = navigation.getParent?.() ?? navigation;
    rootNavigation.navigate('MyLeave');
  };

  const showBalanceShimmer = isLoadingBalances && !refreshing;
  const showHistoryShimmer = isLoadingHistory && !refreshing;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Custom AppBar */}
      <AppBar title="Leave" />

      {/* Background Gradients */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.08)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: moderateScale(110) + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadLeaveData(true)} tintColor={Colors.primary} />
        }
      >
        {/* Welcome Profile Header Section */}
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeLeft}>
            <View style={styles.avatarContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.avatarInitials}>{userInitials}</Text>
                </View>
              )}
            </View>
            <View style={styles.welcomeTextColumn}>
              <Text style={styles.welcomeSubtitle}>HRMS DASHBOARD</Text>
              <Text style={styles.welcomeTitle}>{employeeName}</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.downloadReportBtn} 
            onPress={handleDownloadReport}
            activeOpacity={0.7}
          >
            <Ionicons name="download-outline" size={moderateScale(20)} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Leave Balance Horizontal Slider */}
        <View style={styles.balanceContainer}>
          {showBalanceShimmer ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.balanceScrollContent}>
              {[1, 2].map(i => (
                <View key={i} style={[styles.balanceCardContainer, { backgroundColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center' }]}>
                  <Shimmer width={moderateScale(240)} height={moderateScale(120)} borderRadius={16} />
                </View>
              ))}
            </ScrollView>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.balanceScrollContent}
              decelerationRate="fast"
              snapToInterval={moderateScale(280) + Theme.spacing.md}
              snapToAlignment="start"
            >
              {leaveBalances.map(type => (
                <BalanceCard key={type.id} type={type} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Recent Requests Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Recent Requests</Text>
            <TouchableOpacity onPress={viewAllRequests} activeOpacity={0.7}>
              <Text style={styles.viewAllBtnText}>View All &gt;</Text>
            </TouchableOpacity>
          </View>

          {showHistoryShimmer ? (
            <View style={styles.historyList}>
              {[1, 2, 3].map(i => (
                <View key={i} style={styles.historyCardContainer}>
                  <Shimmer width={moderateScale(42)} height={moderateScale(42)} borderRadius={21} style={{ marginRight: 12 }} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Shimmer width="45%" height={12} borderRadius={3} />
                    <Shimmer width="30%" height={9} borderRadius={2} />
                  </View>
                  <Shimmer width={moderateScale(80)} height={24} borderRadius={12} />
                </View>
              ))}
            </View>
          ) : history.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="document-text-outline" size={moderateScale(32)} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No leave requests yet</Text>
              <Text style={styles.emptySubtitle}>
                When you apply for leave, your requests and approval status will show up here.
              </Text>
            </AppCard>
          ) : (
            <View style={styles.historyList}>
              {history.slice(0, 5).map(item => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('LeaveDetails', { leaveItem: item })}
                >
                  <HistoryCard item={item} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Premium Redesigned Break Banner Card */}
        <TouchableOpacity onPress={openApplyLeave} activeOpacity={0.9}>
          <LinearGradient
            colors={['#FF4D1C', '#D92D20']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.breakBannerCard}
          >
            <View style={styles.breakBannerContent}>
              <View style={styles.breakBannerTextWrap}>
                <Text style={styles.breakBannerTitle}>Ready for a break?</Text>
                <Text style={styles.breakBannerSubtitle}>
                  Plan your next adventure and secure your dates today.
                </Text>
              </View>
              <View style={styles.breakBannerActionBtn}>
                <Ionicons name="arrow-forward" size={moderateScale(20)} color={Colors.primary} />
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
    height: moderateScale(220),
    overflow: 'hidden',
  },
  bannerGradient: {
    flex: 1,
  },
  bannerBlurOrb1: {
    position: 'absolute',
    top: -moderateScale(40),
    left: -moderateScale(40),
    width: moderateScale(180),
    height: moderateScale(180),
    borderRadius: moderateScale(90),
    backgroundColor: 'rgba(255, 179, 0, 0.08)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(20),
    right: -moderateScale(50),
    width: moderateScale(220),
    height: moderateScale(220),
    borderRadius: moderateScale(110),
    backgroundColor: 'rgba(255, 77, 28, 0.05)',
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: moderateScale(10),
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  menuIconButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandingLogo: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: moderateScale(20),
    color: '#FF4D1C',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  downloadReportBtn: {
    width: moderateScale(38),
    height: moderateScale(38),
    borderRadius: moderateScale(19),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    ...Theme.shadow.sm,
  },
  avatarContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 77, 28, 0.15)',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(15),
    color: Colors.primary,
  },
  content: {
    paddingTop: Theme.spacing.md,
    gap: moderateScale(22),
  },
  welcomeSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
    marginTop: Theme.spacing.sm,
  },
  welcomeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  welcomeTextColumn: {
    justifyContent: 'center',
  },
  welcomeSubtitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(9),
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginBottom: moderateScale(2),
  },
  welcomeTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(18),
    color: '#0F172A',
  },
  balanceContainer: {
    marginTop: moderateScale(4),
  },
  balanceScrollContent: {
    paddingHorizontal: Theme.spacing.lg,
    gap: Theme.spacing.md,
    paddingBottom: moderateScale(10),
  },
  balanceCardContainer: {
    width: moderateScale(280),
    height: moderateScale(160),
    borderRadius: moderateScale(24),
    padding: moderateScale(16),
    justifyContent: 'space-between',
    ...Theme.shadow.floating,
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  balanceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  balanceCardLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(10),
    color: '#FFFFFF',
    opacity: 0.9,
    letterSpacing: 0.8,
  },
  balanceCardIconFrame: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCardValue: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: moderateScale(34),
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  balanceCardDaysLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(13),
    color: '#FFFFFF',
  },
  balanceCardFooter: {
    gap: moderateScale(6),
  },
  balanceCardMetricText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  progressBarTrack: {
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: moderateScale(3),
    backgroundColor: '#FFFFFF',
  },
  balanceCardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  balanceCardUsedText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(9),
    color: 'rgba(255, 255, 255, 0.85)',
  },
  sectionContainer: {
    paddingHorizontal: Theme.spacing.lg,
    gap: Theme.spacing.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(2),
  },
  sectionHeading: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: '#0F172A',
  },
  viewAllBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: '#FF4D1C',
  },
  historyList: {
    gap: Theme.spacing.sm,
  },
  historyCardContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(18),
    paddingHorizontal: moderateScale(16),
    paddingVertical: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Theme.shadow.sm,
  },
  historyCardIconBg: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(21),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(12),
  },
  historyCardContent: {
    flex: 1,
    justifyContent: 'center',
  },
  historyCardTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: '#0F172A',
    marginBottom: moderateScale(2),
  },
  historyCardDate: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: '#64748B',
  },
  historyCardBadge: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(5),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyCardBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    letterSpacing: 0.5,
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: moderateScale(30),
    borderRadius: moderateScale(18),
    gap: moderateScale(6),
  },
  emptyIconWrap: {
    width: moderateScale(60),
    height: moderateScale(60),
    borderRadius: moderateScale(30),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(6),
  },
  emptyTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(15),
    color: '#0F172A',
  },
  emptySubtitle: {
    fontFamily: 'Outfit_500Medium',
    textAlign: 'center',
    color: '#64748B',
    fontSize: moderateScale(12),
    lineHeight: moderateScale(18),
    paddingHorizontal: moderateScale(20),
  },
  breakBannerCard: {
    borderRadius: moderateScale(20),
    padding: moderateScale(18),
    marginHorizontal: Theme.spacing.lg,
    ...Theme.shadow.md,
  },
  breakBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: moderateScale(12),
  },
  breakBannerTextWrap: {
    flex: 1,
  },
  breakBannerTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: '#FFFFFF',
    marginBottom: moderateScale(4),
  },
  breakBannerSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: 'rgba(255, 255, 255, 0.82)',
    lineHeight: moderateScale(15),
  },
  breakBannerActionBtn: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.sm,
  },
  fabButton: {
    position: 'absolute',
    right: Theme.spacing.lg,
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: '#FF4D1C',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    ...Theme.shadow.floating,
    shadowColor: '#FF4D1C',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default LeaveScreen;

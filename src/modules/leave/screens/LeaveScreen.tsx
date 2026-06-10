import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppCard from '../../../components/AppCard';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import {
  DEFAULT_LEAVE_TYPES,
  getLeaveBalances,
  getLeaveHistory,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
} from '../services/leave';

const formatDisplayDate = (value: string) => {
  if (!value) {
    return '—';
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatShortDate = (value: string) => {
  if (!value) {
    return '—';
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const statusStyles: Record<
  LeaveStatus,
  { backgroundColor: string; color: string; icon: string; borderColor: string }
> = {
  Pending: {
    backgroundColor: 'rgba(255, 179, 0, 0.10)',
    color: Colors.warningDark,
    icon: 'time-outline',
    borderColor: 'rgba(255, 179, 0, 0.25)',
  },
  Approved: {
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    color: Colors.successDark,
    icon: 'checkmark-circle-outline',
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  Rejected: {
    backgroundColor: 'rgba(239, 68, 68, 0.10)',
    color: Colors.errorDark,
    icon: 'close-circle-outline',
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  Cancelled: {
    backgroundColor: 'rgba(148, 163, 184, 0.12)',
    color: Colors.textSecondary,
    icon: 'ban-outline',
    borderColor: 'rgba(148, 163, 184, 0.25)',
  },
};

const summaryConfig = [
  {
    key: 'pending' as const,
    label: 'Pending',
    icon: 'hourglass-outline',
    tone: Colors.warning,
    bg: 'rgba(255, 179, 0, 0.10)',
  },
  {
    key: 'approved' as const,
    label: 'Approved',
    icon: 'checkmark-circle-outline',
    tone: Colors.success,
    bg: 'rgba(16, 185, 129, 0.10)',
  },
  {
    key: 'rejected' as const,
    label: 'Rejected',
    icon: 'close-circle-outline',
    tone: Colors.error,
    bg: 'rgba(239, 68, 68, 0.10)',
  },
];

const BalanceCard = ({ type }: { type: LeaveType }) => {
  const remaining = type.remaining;
  const total = type.total;
  const hasNumbers = typeof remaining === 'number' && typeof total === 'number' && total > 0;
  const progress = hasNumbers ? Math.min(1, Math.max(0, remaining / total)) : 0;

  return (
    <View style={styles.balanceTile}>
      <View style={styles.balanceIconWrap}>
        <Ionicons name={type.icon as any} size={moderateScale(18)} color={Colors.primary} />
      </View>
      <Text style={styles.balanceTileLabel} numberOfLines={2}>
        {type.label}
      </Text>
      {hasNumbers ? (
        <>
          <Text style={styles.balanceTileValue}>
            {remaining}
            <Text style={styles.balanceTileTotal}> / {total}</Text>
          </Text>
          <View style={styles.progressTrack}>
            <LinearGradient
              colors={Colors.primaryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
          <Text style={styles.balanceTileHint}>days left</Text>
        </>
      ) : (
        <>
          <Text style={styles.balanceTileValue}>—</Text>
          <Text style={styles.balanceTileHint}>Not available</Text>
        </>
      )}
    </View>
  );
};

const HistoryCard = ({ item }: { item: LeaveRequest }) => {
  const tone = statusStyles[item.status];
  const dateRange =
    item.endDate !== item.startDate
      ? `${formatShortDate(item.startDate)} → ${formatShortDate(item.endDate)}`
      : formatShortDate(item.startDate);

  return (
    <View style={styles.historyCard}>
      <View style={[styles.historyAccent, { backgroundColor: tone.color }]} />
      <View style={styles.historyBody}>
        <View style={styles.historyTopRow}>
          <View style={styles.historyTitleBlock}>
            <Text style={styles.historyTitle}>{item.leaveType}</Text>
            <Text style={styles.historyDates}>{dateRange}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: tone.backgroundColor, borderColor: tone.borderColor }]}>
            <Ionicons name={tone.icon as any} size={13} color={tone.color} />
            <Text style={[styles.statusText, { color: tone.color }]}>{item.status}</Text>
          </View>
        </View>

        {item.reason ? (
          <Text style={styles.historyReason} numberOfLines={2}>
            {item.reason}
          </Text>
        ) : null}

        <View style={styles.historyFooter}>
          <View style={styles.historyMetaPill}>
            <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.historyMetaText}>
              {item.days} day{item.days === 1 ? '' : 's'}
            </Text>
          </View>
          <View style={styles.historyMetaPill}>
            <Ionicons name="time-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.historyMetaText}>Applied {formatDisplayDate(item.appliedOn.split('T')[0])}</Text>
          </View>
        </View>
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

  const loadLeaveData = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setIsLoadingHistory(true);
      setIsLoadingBalances(true);
    }

    try {
      const [rows, balances] = await Promise.all([getLeaveHistory(), getLeaveBalances()]);
      setHistory(rows);
      setLeaveBalances(balances);
    } catch {
      setHistory([]);
      setLeaveBalances(DEFAULT_LEAVE_TYPES);
    } finally {
      setIsLoadingHistory(false);
      setIsLoadingBalances(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLeaveData();
    }, [loadLeaveData]),
  );

  const summary = useMemo(
    () => ({
      pending: history.filter(item => item.status === 'Pending').length,
      approved: history.filter(item => item.status === 'Approved').length,
      rejected: history.filter(item => item.status === 'Rejected').length,
    }),
    [history],
  );

  const openApplyLeave = () => {
    const rootNavigation = navigation.getParent?.() ?? navigation;
    rootNavigation.navigate('ApplyLeave');
  };

  const isInitialLoading = isLoadingHistory && isLoadingBalances && !refreshing;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.12)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Leave</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: moderateScale(100) + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => loadLeaveData(true)} tintColor={Colors.primary} />
        }
      >
        <TouchableOpacity style={styles.applyCard} onPress={openApplyLeave} activeOpacity={0.88}>
          <LinearGradient
            colors={Colors.primaryGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.applyGradient}
          >
            <View style={styles.applyLeft}>
              <View style={styles.applyIconWrap}>
                <Ionicons name="add-circle-outline" size={moderateScale(26)} color={Colors.white} />
              </View>
              <View style={styles.applyCopy}>
                <Text style={styles.applyTitle}>Apply for leave</Text>
                <Text style={styles.applySubtitle}>Submit a new time-off request</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={moderateScale(20)} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.sectionContainer}>
          <Text style={styles.sectionHeading}>Overview</Text>
          <View style={styles.summaryRow}>
            {summaryConfig.map(item => (
              <View key={item.key} style={styles.summaryCard}>
                <View style={[styles.summaryIconFrame, { backgroundColor: item.bg }]}>
                  <Ionicons name={item.icon as any} size={moderateScale(18)} color={item.tone} />
                </View>
                <Text style={[styles.summaryValue, { color: item.tone }]}>{summary[item.key]}</Text>
                <Text style={styles.summaryLabel}>{item.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Leave balance</Text>
            {isLoadingBalances ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
          </View>

          {isLoadingBalances && leaveBalances.length === 0 ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : (
            <View style={styles.balanceGrid}>
              {leaveBalances.map(type => (
                <BalanceCard key={type.id} type={type} />
              ))}
            </View>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeading}>Leave history</Text>
            {isLoadingHistory ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
          </View>

          {isInitialLoading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loadingText}>Loading your leave records...</Text>
            </View>
          ) : history.length === 0 ? (
            <AppCard style={styles.emptyCard}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="document-text-outline" size={moderateScale(36)} color={Colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>No leave requests yet</Text>
              <Text style={styles.emptySubtitle}>
                When you apply for leave, your requests and approval status will show up here.
              </Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openApplyLeave} activeOpacity={0.85}>
                <Text style={styles.emptyButtonText}>Apply for leave</Text>
              </TouchableOpacity>
            </AppCard>
          ) : (
            <View style={styles.historyList}>
              {history.map(item => (
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
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: moderateScale(180),
    overflow: 'hidden',
  },
  bannerGradient: {
    flex: 1,
  },
  bannerBlurOrb1: {
    position: 'absolute',
    top: -moderateScale(40),
    left: -moderateScale(40),
    width: moderateScale(160),
    height: moderateScale(160),
    borderRadius: moderateScale(80),
    backgroundColor: 'rgba(255, 179, 0, 0.12)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(20),
    right: -moderateScale(50),
    width: moderateScale(200),
    height: moderateScale(200),
    borderRadius: moderateScale(100),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    zIndex: 10,
  },
  headerRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.sm,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: moderateScale(120),
    gap: moderateScale(28),
  },
  applyCard: {
    borderRadius: Theme.borderRadius.xxl,
    overflow: 'hidden',
    ...Theme.shadow.floating,
    shadowOpacity: 0.12,
  },
  applyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(18),
  },
  applyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    flex: 1,
  },
  applyIconWrap: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyCopy: {
    flex: 1,
  },
  applyTitle: {
    ...Typography.heading,
    color: Colors.white,
    fontSize: moderateScale(16),
    marginBottom: 2,
  },
  applySubtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.85)',
    fontSize: moderateScale(12),
  },
  sectionContainer: {
    gap: Theme.spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(4),
  },
  sectionHeading: {
    ...Typography.label,
    fontSize: moderateScale(13),
    color: Colors.textMuted,
    letterSpacing: 1.2,
    marginLeft: moderateScale(4),
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xxl,
    paddingVertical: moderateScale(14),
    paddingHorizontal: moderateScale(8),
    borderWidth: 0,
    ...Theme.shadow.md,
  },
  summaryIconFrame: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(8),
  },
  summaryValue: {
    ...Typography.heading,
    fontSize: moderateScale(20),
    marginBottom: 2,
  },
  summaryLabel: {
    ...Typography.caption,
    fontSize: moderateScale(10),
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  balanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
  },
  balanceTile: {
    width: '48.5%',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xxl,
    padding: Theme.spacing.sm,
    borderWidth: 0,
    ...Theme.shadow.md,
    minHeight: moderateScale(132),
  },
  balanceIconWrap: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(8),
  },
  balanceTileLabel: {
    ...Typography.subheading,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginBottom: moderateScale(6),
    minHeight: moderateScale(32),
  },
  balanceTileValue: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  balanceTileTotal: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.textMuted,
    fontWeight: '600',
  },
  progressTrack: {
    height: moderateScale(5),
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Colors.surfaceMuted,
    marginTop: moderateScale(8),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: Colors.primary,
  },
  balanceTileHint: {
    ...Typography.caption,
    fontSize: moderateScale(10),
    color: Colors.textMuted,
    marginTop: moderateScale(4),
    textTransform: 'none',
    letterSpacing: 0,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xl,
    gap: Theme.spacing.sm,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textMuted,
    fontSize: moderateScale(13),
  },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  emptyIconWrap: {
    width: moderateScale(72),
    height: moderateScale(72),
    borderRadius: moderateScale(36),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  emptyTitle: {
    ...Typography.subheading,
    fontSize: moderateScale(16),
    marginBottom: Theme.spacing.xs,
  },
  emptySubtitle: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.textSecondary,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(20),
    marginBottom: Theme.spacing.md,
  },
  emptyButton: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: moderateScale(12),
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: 'rgba(255, 77, 28, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 28, 0.18)',
  },
  emptyButtonText: {
    ...Typography.subheading,
    color: Colors.primary,
    fontSize: moderateScale(13),
  },
  historyList: {
    gap: Theme.spacing.sm,
  },
  historyCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xxl,
    borderWidth: 0,
    overflow: 'hidden',
    ...Theme.shadow.md,
  },
  historyAccent: {
    width: moderateScale(4),
  },
  historyBody: {
    flex: 1,
    padding: Theme.spacing.sm,
    paddingLeft: Theme.spacing.md,
    gap: moderateScale(8),
  },
  historyTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Theme.spacing.sm,
  },
  historyTitleBlock: {
    flex: 1,
  },
  historyTitle: {
    ...Typography.subheading,
    fontSize: moderateScale(15),
    color: Colors.text,
    marginBottom: 2,
  },
  historyDates: {
    ...Typography.caption,
    color: Colors.textSecondary,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: moderateScale(11),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Theme.borderRadius.pill,
    borderWidth: 1,
  },
  statusText: {
    ...Typography.caption,
    fontSize: moderateScale(10),
    textTransform: 'none',
    letterSpacing: 0,
    fontWeight: '700',
  },
  historyReason: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    lineHeight: moderateScale(18),
  },
  historyFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.xs,
  },
  historyMetaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.pill,
  },
  historyMetaText: {
    ...Typography.caption,
    color: Colors.textMuted,
    textTransform: 'none',
    letterSpacing: 0,
    fontSize: moderateScale(10),
  },
});

export default LeaveScreen;

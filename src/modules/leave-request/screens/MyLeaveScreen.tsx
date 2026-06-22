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
} from 'react-native';
import { downloadReport } from '../../../utils/reportDownloader';
import Shimmer from '../../../components/Shimmer';
import AppBar from '../../../components/AppBar';
import { getAuthSession } from '../../auth/services/auth';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppCard from '../../../components/AppCard';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { getLeaveHistory, LeaveRequest, LeaveStatus } from '../services/leave';

const statusTone: Record<LeaveStatus, { color: string; bg: string; icon: string }> = {
  Pending: { color: Colors.warning, bg: 'rgba(255, 179, 0, 0.08)', icon: 'time-outline' },
  Approved: { color: Colors.success, bg: 'rgba(16, 185, 129, 0.08)', icon: 'checkmark-circle-outline' },
  Rejected: { color: Colors.error, bg: 'rgba(239, 68, 68, 0.08)', icon: 'close-circle-outline' },
  Cancelled: { color: Colors.textSecondary, bg: 'rgba(148, 163, 184, 0.08)', icon: 'ban-outline' },
};

const getLeaveTypeConfig = (leaveType: string) => {
  const type = leaveType.toLowerCase();
  if (type.includes('sick')) {
    return { icon: 'medkit-outline', color: '#0EA5E9', bg: '#F0F9FF', gradient: ['#38BDF8', '#0EA5E9'] as const };
  }
  if (type.includes('casual')) {
    return { icon: 'cafe-outline', color: '#F59E0B', bg: '#FFFBEB', gradient: ['#FBBF24', '#F59E0B'] as const };
  }
  if (type.includes('annual')) {
    return { icon: 'airplane-outline', color: '#FF4D1C', bg: '#FFF5F2', gradient: ['#FFA040', '#FF4D1C'] as const };
  }
  if (type.includes('holiday')) {
    return { icon: 'calendar-outline', color: '#EC4899', bg: '#FDF2F8', gradient: ['#F472B6', '#EC4899'] as const };
  }
  return { icon: 'document-text-outline', color: '#6366F1', bg: '#EEF2FF', gradient: ['#818CF8', '#6366F1'] as const };
};

const formatDate = (value: string) => {
  try {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const formatDateRange = (startDate: string, endDate: string) => {
  if (startDate === endDate) {
    return formatDate(startDate);
  }
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

const MyLeaveScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const rows = await getLeaveHistory();
      setHistory(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the server.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchHistory();
    }, [fetchHistory])
  );

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const summary = useMemo(
    () => ({
      pending: history.filter(item => item.status === 'Pending').length,
      approved: history.filter(item => item.status === 'Approved').length,
      rejected: history.filter(item => item.status === 'Rejected').length,
    }),
    [history],
  );

  const summaryCards = useMemo(
    () => [
      {
        label: 'Pending',
        value: String(summary.pending).padStart(2, '0'),
        icon: 'time-outline',
        tone: '#FFB300', // Amber/gold
        bg: '#FFFDF5', // Warm light amber tint
        border: 'rgba(255, 179, 0, 0.22)',
        iconBg: '#FFFFFF',
        shadow: 'rgba(255, 179, 0, 0.15)',
      },
      {
        label: 'Approved',
        value: String(summary.approved).padStart(2, '0'),
        icon: 'checkmark-circle-outline',
        tone: '#10B981', // Success Emerald green
        bg: '#F0FDF4', // Crisp light green tint
        border: 'rgba(16, 185, 129, 0.22)',
        iconBg: '#FFFFFF',
        shadow: 'rgba(16, 185, 129, 0.15)',
      },
      {
        label: 'Rejected',
        value: String(summary.rejected).padStart(2, '0'),
        icon: 'close-circle-outline',
        tone: '#EF4444', // Danger Red
        bg: '#FEF2F2', // Soft light red tint
        border: 'rgba(239, 68, 68, 0.22)',
        iconBg: '#FFFFFF',
        shadow: 'rgba(239, 68, 68, 0.15)',
      },
    ],
    [summary],
  );

  const totalApprovedDays = useMemo(() => {
    return history
      .filter(item => item.status === 'Approved')
      .reduce((total, item) => total + item.days, 0);
  }, [history]);

  const groupedHistory = useMemo(() => {
    const groups: Record<string, LeaveRequest[]> = {};
    history.forEach(item => {
      const key = item.startDate;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    // Sort the groups by date descending
    return Object.keys(groups)
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
      .map(date => ({
        date,
        requests: groups[date],
      }));
  }, [history]);

  const openApplyLeave = () => {
    navigation.navigate('ApplyLeave');
  };

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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Custom AppBar */}
      <AppBar title="Leave" showBackButton onBackPress={() => navigation.goBack()} />

      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.12)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: moderateScale(100) + insets.bottom }]}>
          {/* Summary Row Shimmer */}
          <View style={styles.summaryRow}>
            {[1, 2, 3].map(i => (
              <View key={i} style={[styles.summaryCard, { paddingVertical: Theme.spacing.md, alignItems: 'center', borderColor: '#F1F5F9', borderWidth: 1 }]}>
                <Shimmer width={moderateScale(34)} height={moderateScale(34)} borderRadius={10} style={{ marginBottom: Theme.spacing.sm }} />
                <Shimmer width="60%" height={moderateScale(22)} borderRadius={4} style={{ marginBottom: Theme.spacing.xs }} />
                <Shimmer width="40%" height={moderateScale(10)} borderRadius={2} />
              </View>
            ))}
          </View>

          {/* Insight Card Shimmer */}
          <AppCard style={styles.insightCard}>
            <Shimmer width={moderateScale(42)} height={moderateScale(42)} borderRadius={moderateScale(12)} />
            <View style={{ flex: 1, gap: 5 }}>
              <Shimmer width="40%" height={12} borderRadius={3} />
              <Shimmer width="60%" height={18} borderRadius={4} />
            </View>
          </AppCard>

          {/* Section Title Shimmer */}
          <View style={styles.sectionHeader}>
            <Shimmer width="45%" height={20} borderRadius={4} />
            <Shimmer width="25%" height={28} borderRadius={12} />
          </View>

          {/* Leave List Items Shimmer */}
          {[1, 2, 3].map(i => (
            <AppCard key={i} style={[styles.logCard, { padding: Theme.spacing.md, gap: Theme.spacing.sm, flexDirection: 'row', alignItems: 'center' }]}>
              <View style={{ flex: 1, gap: 6 }}>
                <Shimmer width="65%" height={16} borderRadius={4} />
                <Shimmer width="45%" height={12} borderRadius={3} />
                <Shimmer width="80%" height={10} borderRadius={2} />
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <Shimmer width={60} height={20} borderRadius={Theme.borderRadius.pill} />
                <Shimmer width={30} height={14} borderRadius={3} />
              </View>
            </AppCard>
          ))}
        </ScrollView>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={moderateScale(48)} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchHistory()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: moderateScale(100) + insets.bottom }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchHistory(true)}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Glowing Status Cards */}
          <View style={styles.summaryRow}>
            {summaryCards.map(item => (
              <View
                key={item.label}
                style={[
                  styles.summaryCard,
                  { 
                    backgroundColor: item.bg, 
                    borderColor: item.border,
                    shadowColor: item.shadow,
                  }
                ]}
              >
                <View style={styles.summaryIconContainer}>
                  <Ionicons name={item.icon as any} size={moderateScale(16)} color={item.tone} />
                </View>
                <Text style={[styles.summaryValue, { color: item.tone }]}>{item.value}</Text>
                <Text style={[styles.summaryLabel, { color: item.tone }]} numberOfLines={1}>
                  {item.label.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>

          {/* Premium approved leave banner */}
          <LinearGradient
            colors={['#FF4D1C', '#FF8C00']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.insightCard}
          >
            <View style={styles.insightIconContainer}>
              <Ionicons name="calendar-outline" size={moderateScale(20)} color={Colors.primary} />
            </View>
            <View style={styles.insightCopy}>
              <Text style={styles.insightTitle}>Approved Leave Days</Text>
              <Text style={styles.insightText}>
                You have taken approved days off so far this year.
              </Text>
            </View>
            <View style={styles.insightCounterBadge}>
              <Text style={styles.insightCounterText}>
                {String(totalApprovedDays).padStart(2, '0')}
              </Text>
            </View>
          </LinearGradient>

          {/* Redesigned Section Header with Action Button */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Requests</Text>
            <TouchableOpacity onPress={openApplyLeave} activeOpacity={0.9}>
              <LinearGradient
                colors={Colors.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sectionActionContainer}
              >
                <Ionicons name="add" size={moderateScale(14)} color={Colors.white} />
                <Text style={styles.sectionAction}>APPLY LEAVE</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={moderateScale(40)} color={Colors.borderStrong} />
              <Text style={styles.emptyText}>No leave requests found yet.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openApplyLeave} activeOpacity={0.85}>
                <Text style={styles.emptyButtonText}>Apply for leave</Text>
              </TouchableOpacity>
            </View>
          ) : (
            groupedHistory.map(group => {
              if (group.requests.length === 1) {
                const item = group.requests[0];
                const tone = statusTone[item.status] || { color: Colors.textSecondary, bg: 'rgba(148, 163, 184, 0.08)', icon: 'ban-outline' };
                const typeConfig = getLeaveTypeConfig(item.leaveType);
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('LeaveDetails', { leaveItem: item })}
                  >
                    <View style={[styles.logCard, { borderLeftWidth: moderateScale(4), borderLeftColor: tone.color }]}>
                      <View style={styles.logContent}>
                        <LinearGradient
                          colors={typeConfig.gradient}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.logTypeIconContainer}
                        >
                          <Ionicons name={typeConfig.icon as any} size={moderateScale(16)} color={Colors.white} />
                        </LinearGradient>
                        <View style={styles.logBody}>
                          <Text style={styles.logTitle}>{item.leaveType}</Text>
                          <Text style={styles.logDateRange}>{formatDateRange(item.startDate, item.endDate)}</Text>
                          {item.reason ? (
                            <Text style={styles.logReason} numberOfLines={1}>
                              {item.reason}
                            </Text>
                          ) : null}
                        </View>
                        <View style={styles.logMeta}>
                          <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                            <Text style={[styles.logStatus, { color: tone.color }]}>{item.status.toUpperCase()}</Text>
                          </View>
                          <Text style={styles.logDays}>
                            {item.days} Day{item.days === 1 ? '' : 's'}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={moderateScale(16)} color={Colors.textMuted} style={styles.chevron} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              } else {
                return (
                  <View key={group.date} style={styles.groupedCard}>
                    <View style={styles.groupedCardHeader}>
                      <Ionicons name="calendar-sharp" size={moderateScale(14)} color={Colors.primary} />
                      <Text style={styles.groupedCardDateText}>{formatDate(group.date)}</Text>
                      <View style={styles.groupedCountBadge}>
                        <Text style={styles.groupedCountText}>{group.requests.length} Requests</Text>
                      </View>
                    </View>
                    
                    <View style={styles.groupedRequestsList}>
                      {group.requests.map((item, idx) => {
                        const tone = statusTone[item.status] || { color: Colors.textSecondary, bg: 'rgba(148, 163, 184, 0.08)', icon: 'ban-outline' };
                        const typeConfig = getLeaveTypeConfig(item.leaveType);
                        return (
                          <View key={item.id}>
                            {idx > 0 && <View style={styles.groupedDivider} />}
                            <TouchableOpacity
                              activeOpacity={0.7}
                              onPress={() => navigation.navigate('LeaveDetails', { leaveItem: item })}
                              style={styles.groupedRequestRow}
                            >
                              <View style={[styles.groupedRowAccentBar, { backgroundColor: tone.color }]} />
                              <View style={styles.groupedRowContent}>
                                <LinearGradient
                                  colors={typeConfig.gradient}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={[styles.logTypeIconContainer, { width: moderateScale(34), height: moderateScale(34), marginRight: moderateScale(10) }]}
                                >
                                  <Ionicons name={typeConfig.icon as any} size={moderateScale(14)} color={Colors.white} />
                                </LinearGradient>
                                <View style={styles.logBody}>
                                  <Text style={[styles.logTitle, { fontSize: moderateScale(13) }]}>{item.leaveType}</Text>
                                  <Text style={[styles.logDateRange, { fontSize: moderateScale(10), marginTop: 1 }]}>
                                    {item.startDate === item.endDate ? 'Full Day' : formatDateRange(item.startDate, item.endDate)}
                                  </Text>
                                  {item.reason ? (
                                    <Text style={[styles.logReason, { fontSize: moderateScale(9), marginTop: 2 }]} numberOfLines={1}>
                                      {item.reason}
                                    </Text>
                                  ) : null}
                                </View>
                                <View style={styles.logMeta}>
                                  <View style={[styles.statusPill, { backgroundColor: tone.bg, paddingHorizontal: moderateScale(6), paddingVertical: moderateScale(2) }]}>
                                    <Text style={[styles.logStatus, { color: tone.color, fontSize: moderateScale(7) }]}>{item.status.toUpperCase()}</Text>
                                  </View>
                                  <Text style={[styles.logDays, { fontSize: moderateScale(10) }]}>
                                    {item.days} Day{item.days === 1 ? '' : 's'}
                                  </Text>
                                </View>
                                <Ionicons name="chevron-forward" size={moderateScale(14)} color={Colors.textMuted} style={styles.chevron} />
                              </View>
                            </TouchableOpacity>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                );
              }
            })
          )}
        </ScrollView>
      )}
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
    zIndex: -1,
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
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: moderateScale(120),
    gap: Theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(14),
    paddingHorizontal: moderateScale(6),
    borderRadius: moderateScale(18),
    borderWidth: 1.2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryIconContainer: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(10),
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(6),
    ...Theme.shadow.sm,
  },
  summaryValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(22),
    lineHeight: moderateScale(26),
  },
  summaryLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    letterSpacing: 0.5,
    marginTop: moderateScale(1),
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    padding: moderateScale(16),
    borderRadius: moderateScale(20),
    overflow: 'hidden',
    ...Theme.shadow.md,
  },
  insightIconContainer: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.sm,
  },
  insightCopy: {
    flex: 1,
    zIndex: 2,
  },
  insightTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(15),
    color: Colors.white,
  },
  insightText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    marginTop: moderateScale(3),
    lineHeight: moderateScale(15),
    color: 'rgba(255, 255, 255, 0.85)',
  },
  insightCounterBadge: {
    width: moderateScale(46),
    height: moderateScale(46),
    borderRadius: moderateScale(23),
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Theme.shadow.sm,
  },
  insightCounterText: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: moderateScale(16),
    color: Colors.primary,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  sectionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.text,
  },
  sectionActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    paddingVertical: moderateScale(8),
    paddingHorizontal: moderateScale(14),
    borderRadius: moderateScale(14),
    ...Theme.shadow.sm,
  },
  sectionAction: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    color: Colors.white,
    letterSpacing: 0.5,
  },
  logCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    ...Theme.shadow.sm,
  },
  logContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(12),
  },
  logTypeIconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: moderateScale(12),
    ...Theme.shadow.sm,
  },
  logBody: {
    flex: 1,
    paddingRight: moderateScale(6),
  },
  logTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  logDateRange: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    marginTop: moderateScale(2),
  },
  logReason: {
    fontFamily: 'Outfit_400Regular',
    fontSize: moderateScale(10),
    color: Colors.textMuted,
    marginTop: moderateScale(3),
  },
  logMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: moderateScale(4),
  },
  statusPill: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(3),
    borderRadius: moderateScale(6),
    marginBottom: moderateScale(3),
  },
  logStatus: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(8),
    letterSpacing: 0.3,
  },
  logDays: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(11),
    color: Colors.text,
  },
  chevron: {
    marginLeft: moderateScale(2),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    gap: Theme.spacing.md,
  },
  errorText: {
    ...Typography.body,
    color: Colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Theme.spacing.xl,
    paddingVertical: Theme.spacing.sm,
    borderRadius: Theme.borderRadius.md,
  },
  retryText: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.white,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xxl,
    gap: Theme.spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: moderateScale(10),
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: 'rgba(255, 77, 28, 0.10)',
  },
  emptyButtonText: {
    ...Typography.subheading,
    color: Colors.primary,
    fontSize: moderateScale(13),
  },
  groupedCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(18),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    ...Theme.shadow.sm,
  },
  groupedCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(12),
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: moderateScale(6),
  },
  groupedCardDateText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(13),
    color: Colors.text,
    flex: 1,
  },
  groupedCountBadge: {
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    paddingVertical: moderateScale(3),
    paddingHorizontal: moderateScale(8),
    borderRadius: moderateScale(8),
  },
  groupedCountText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    color: Colors.primary,
  },
  groupedRequestsList: {
    backgroundColor: Colors.white,
  },
  groupedRequestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupedRowAccentBar: {
    width: moderateScale(4),
    alignSelf: 'stretch',
  },
  groupedRowContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(10),
    paddingHorizontal: moderateScale(12),
  },
  groupedDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: moderateScale(16),
  },
});

export default MyLeaveScreen;

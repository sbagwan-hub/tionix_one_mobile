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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppCard from '../../../components/AppCard';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { getAttendanceHistory, AttendanceHistoryDay } from '../services/attendance';

const formatTime = (isoString: string) => {
  try {
    const date = new Date(isoString);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const minutesStr = minutes < 10 ? '0' + minutes : minutes;
    const hoursStr = hours < 10 ? '0' + hours : hours;
    return `${hoursStr}:${minutesStr} ${ampm}`;
  } catch {
    return '--:--';
  }
};

const MyAttendanceScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<AttendanceHistoryDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PRESENT' | 'LATE'>('ALL');

  const fetchHistory = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const response = await getAttendanceHistory();
      if (response.success && response.data) {
        setHistory(response.data);
      } else {
        setError('Failed to fetch attendance history.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the server.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, []);

  const getDayStatus = useCallback((day: AttendanceHistoryDay) => {
    const inPunch = day.records?.find(r => r.Punch === 'Check IN');
    if (!inPunch) return 'Absent';
    const dateObj = new Date(inPunch.PunchDatetime);
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    return (hours > 9 || (hours === 9 && minutes > 15)) ? 'Late' : 'Present';
  }, []);

  const presentCount = useMemo(() => {
    return history.filter(day => {
      const status = getDayStatus(day);
      return status === 'Present' || status === 'Late';
    }).length;
  }, [history, getDayStatus]);

  const lateCount = useMemo(() => {
    return history.filter(day => {
      const status = getDayStatus(day);
      return status === 'Late';
    }).length;
  }, [history, getDayStatus]);

  const absentCount = useMemo(() => {
    return history.filter(day => {
      const status = getDayStatus(day);
      return status === 'Absent';
    }).length;
  }, [history, getDayStatus]);

  const summaryCards = useMemo(() => [
    { label: 'Present', value: String(presentCount).padStart(2, '0'), icon: 'checkmark-circle-outline', tone: Colors.success },
    { label: 'Late', value: String(lateCount).padStart(2, '0'), icon: 'time-outline', tone: Colors.warning },
    { label: 'Absent', value: String(absentCount).padStart(2, '0'), icon: 'close-circle-outline', tone: Colors.error },
  ], [presentCount, lateCount, absentCount]);

  const averageWorkHours = useMemo(() => {
    let totalMinutes = 0;
    let daysWithWork = 0;

    history.forEach(day => {
      const match = day.totalWork.match(/(\d+)h\s+(\d+)m/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const mins = parseInt(match[2], 10);
        const total = hours * 60 + mins;
        if (total > 0) {
          totalMinutes += total;
          daysWithWork += 1;
        }
      }
    });

    if (daysWithWork === 0) return '0h 00m';

    const avgMinutes = Math.round(totalMinutes / daysWithWork);
    const avgHours = Math.floor(avgMinutes / 60);
    const avgMinsRemaining = avgMinutes % 60;
    return `${avgHours}h ${String(avgMinsRemaining).padStart(2, '0')}m`;
  }, [history]);

  const attendanceRate = useMemo(() => {
    const totalWorkingDays = history.length;
    if (totalWorkingDays === 0) return '0%';
    const rate = ((presentCount + lateCount) / totalWorkingDays) * 100;
    return `${rate.toFixed(1)}%`;
  }, [history, presentCount, lateCount]);

  const averageWorkHoursDecimal = useMemo(() => {
    let totalMinutes = 0;
    let daysWithWork = 0;

    history.forEach(day => {
      const match = day.totalWork.match(/(\d+)h\s+(\d+)m/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const mins = parseInt(match[2], 10);
        const total = hours * 60 + mins;
        if (total > 0) {
          totalMinutes += total;
          daysWithWork += 1;
        }
      }
    });

    if (daysWithWork === 0) return 0;
    return totalMinutes / daysWithWork / 60;
  }, [history]);

  const shiftCompletionPercent = useMemo(() => {
    const standardShiftHours = 8.0;
    if (averageWorkHoursDecimal === 0) return 0;
    const percent = (averageWorkHoursDecimal / standardShiftHours) * 100;
    return Math.min(100, Math.round(percent));
  }, [averageWorkHoursDecimal]);

  const filteredHistory = useMemo(() => {
    return history.filter(day => {
      const status = getDayStatus(day);
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'PRESENT') return status === 'Present' || status === 'Late';
      if (activeFilter === 'LATE') return status === 'Late';
      return true;
    });
  }, [history, activeFilter, getDayStatus]);

  const formatDate = (dateStr: string) => {
    try {
      const dateObj = new Date(dateStr);
      return dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getDailyPunches = (day: AttendanceHistoryDay) => {
    const inPunch = day.records?.find(r => r.Punch === 'Check IN');
    const outPunch = day.records ? [...day.records].reverse().find(r => r.Punch === 'Check OUT') : undefined;
    return { inPunch, outPunch };
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
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back-outline" size={moderateScale(22)} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Attendance</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.monthLabel}>{currentMonthName}</Text>
          <Text style={styles.headerSubtitle}>Track your monthly attendance summary and daily logs.</Text>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading history...</Text>
        </View>
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
          contentContainerStyle={[styles.content, { paddingBottom: moderateScale(120) + insets.bottom }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchHistory(true)}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          <View style={styles.summaryRow}>
            {summaryCards.map(item => (
              <AppCard key={item.label} style={styles.summaryCard}>
                <View style={[styles.summaryIcon, { backgroundColor: `${item.tone}12` }]}>
                  <Ionicons name={item.icon as any} size={moderateScale(20)} color={item.tone} />
                </View>
                <Text style={styles.summaryValue}>{item.value}</Text>
                <Text style={styles.summaryLabel}>{item.label}</Text>
              </AppCard>
            ))}
          </View>

          <AppCard style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={styles.insightTitleContainer}>
                <Ionicons name="analytics-outline" size={moderateScale(20)} color={Colors.primary} />
                <Text style={styles.insightCardTitle}>Analytics Overview</Text>
              </View>
              <Text style={styles.avgHoursLabel}>Avg: {averageWorkHours}</Text>
            </View>

            <View style={styles.statsPanel}>
              <View style={styles.statMetricItem}>
                <View style={styles.metricInfoRow}>
                  <Text style={styles.metricLabel}>Attendance Rate</Text>
                  <Text style={styles.metricValue}>{attendanceRate}</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={Colors.successGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressBarFill,
                      {
                        width: attendanceRate as any,
                      }
                    ]}
                  />
                </View>
              </View>

              <View style={styles.statMetricItem}>
                <View style={styles.metricInfoRow}>
                  <Text style={styles.metricLabel}>Shift Target Completion (8h)</Text>
                  <Text style={styles.metricValue}>{shiftCompletionPercent}%</Text>
                </View>
                <View style={styles.progressBarBg}>
                  <LinearGradient
                    colors={Colors.primaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${shiftCompletionPercent}%` as any,
                      }
                    ]}
                  />
                </View>
              </View>
            </View>
          </AppCard>

          <View style={styles.filterTabsContainer}>
            {(['ALL', 'PRESENT', 'LATE'] as const).map(filter => {
              const isActive = activeFilter === filter;
              return (
                <TouchableOpacity
                  key={filter}
                  onPress={() => setActiveFilter(filter)}
                  style={[styles.filterTab, isActive && styles.filterTabActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.filterTabText, isActive && styles.filterTabTextActive]}>
                    {filter === 'ALL' ? 'All' : filter === 'PRESENT' ? 'Present' : 'Late'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Daily Logs</Text>
            <Text style={styles.sectionAction}>This Month</Text>
          </View>

          {filteredHistory.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={moderateScale(40)} color={Colors.borderStrong} />
              <Text style={styles.emptyText}>No attendance records found matching this filter.</Text>
            </View>
          ) : (
            filteredHistory.map((log, index) => {
              const statusVal = getDayStatus(log);
              const isLate = statusVal === 'Late';
              const { inPunch, outPunch } = getDailyPunches(log);
              const inTime = inPunch ? formatTime(inPunch.PunchDatetime) : '--:--';
              const outTime = outPunch ? formatTime(outPunch.PunchDatetime) : '--:--';

              return (
                <AppCard key={index} style={styles.logCard}>
                  {/* Left edge colored indicator stripe */}
                  <View style={[styles.logAccentBar, { backgroundColor: isLate ? Colors.warning : Colors.success }]} />
                  
                  <View style={styles.logContainer}>
                    {/* Top Row: Date and Status Badge */}
                    <View style={styles.logTopRow}>
                      <Text style={styles.logDateText}>{formatDate(log.date)}</Text>
                      <View style={[styles.statusPill, { backgroundColor: isLate ? 'rgba(255, 179, 0, 0.08)' : 'rgba(16, 185, 129, 0.08)' }]}>
                        <Text style={[styles.logStatus, { color: isLate ? Colors.warningDark : Colors.successDark }]}>
                          {statusVal}
                        </Text>
                      </View>
                    </View>

                    {/* Middle Row: Punch IN / Punch OUT Timeline Columns */}
                    <View style={styles.logMiddleRow}>
                      <View style={styles.punchColumn}>
                        <View style={[styles.punchIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.06)' }]}>
                          <Ionicons name="arrow-down" size={moderateScale(14)} color={Colors.success} />
                        </View>
                        <View>
                          <Text style={styles.punchTimeLabel}>CHECK IN</Text>
                          <Text style={styles.punchTimeValue}>{inTime}</Text>
                        </View>
                      </View>

                      <View style={styles.punchColumn}>
                        <View style={[styles.punchIconBox, { backgroundColor: 'rgba(255, 179, 0, 0.06)' }]}>
                          <Ionicons name="arrow-up" size={moderateScale(14)} color={Colors.accent} />
                        </View>
                        <View>
                          <Text style={styles.punchTimeLabel}>CHECK OUT</Text>
                          <Text style={styles.punchTimeValue}>{outTime}</Text>
                        </View>
                      </View>
                    </View>

                    {/* Bottom Row: Working Hours info */}
                    <View style={styles.logBottomRow}>
                      <View style={styles.workHoursContainer}>
                        <Ionicons name="time-outline" size={moderateScale(15)} color={Colors.textMuted} />
                        <Text style={styles.workHoursText}>Total Hours: </Text>
                        <Text style={styles.workHoursValue}>{log.totalWork}</Text>
                      </View>
                    </View>
                  </View>
                </AppCard>
              );
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
    backgroundColor: 'transparent',
    paddingBottom: Theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
  },
  backButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(10),
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  headerSpacer: {
    width: moderateScale(40),
  },
  headerContent: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  monthLabel: {
    ...Typography.heading,
    color: Colors.text,
    fontSize: moderateScale(34),
    letterSpacing: -1,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: moderateScale(4),
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
    paddingVertical: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xxl,
    borderWidth: 0,
    ...Theme.shadow.floating,
    shadowOpacity: 0.05,
  },
  summaryIcon: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  summaryValue: {
    ...Typography.heading,
    fontSize: moderateScale(22),
    color: Colors.text,
  },
  summaryLabel: {
    ...Typography.label,
    marginTop: moderateScale(2),
    color: Colors.textMuted,
  },
  insightCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0,
    ...Theme.shadow.card,
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: moderateScale(10),
    marginBottom: moderateScale(12),
  },
  insightTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  insightCardTitle: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
  },
  avgHoursLabel: {
    ...Typography.label,
    fontSize: moderateScale(10),
    color: Colors.primary,
    fontWeight: '800',
  },
  statsPanel: {
    gap: moderateScale(12),
  },
  statMetricItem: {
    width: '100%',
  },
  metricInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    ...Typography.caption,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  metricValue: {
    ...Typography.heading,
    fontSize: moderateScale(13),
    color: Colors.text,
  },
  progressBarBg: {
    height: moderateScale(6),
    backgroundColor: '#F1F5F9',
    borderRadius: moderateScale(3),
    width: '100%',
    marginTop: moderateScale(6),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: moderateScale(3),
  },
  filterTabsContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: Theme.borderRadius.lg,
    padding: moderateScale(4),
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  filterTab: {
    flex: 1,
    paddingVertical: moderateScale(8),
    alignItems: 'center',
    borderRadius: Theme.borderRadius.md,
  },
  filterTabActive: {
    backgroundColor: Colors.white,
    ...Theme.shadow.sm,
  },
  filterTabText: {
    ...Typography.heading,
    fontSize: moderateScale(13),
    color: Colors.textMuted,
  },
  filterTabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  sectionTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  sectionAction: {
    ...Typography.label,
    color: Colors.primary,
  },
  logCard: {
    padding: 0,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    overflow: 'hidden',
    flexDirection: 'row',
    marginBottom: Theme.spacing.sm,
    borderWidth: 0,
    ...Theme.shadow.md,
  },
  logAccentBar: {
    width: moderateScale(4),
  },
  logContainer: {
    flex: 1,
    padding: Theme.spacing.md,
  },
  logTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  logDateText: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
  },
  statusPill: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: Theme.borderRadius.pill,
  },
  logStatus: {
    ...Typography.label,
    fontSize: moderateScale(10),
    fontWeight: '800',
  },
  logMiddleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.borderRadius.lg,
    padding: moderateScale(10),
    marginBottom: Theme.spacing.sm,
  },
  punchColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
    flex: 1,
  },
  punchIconBox: {
    width: moderateScale(26),
    height: moderateScale(26),
    borderRadius: moderateScale(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  punchTimeLabel: {
    ...Typography.label,
    fontSize: moderateScale(8),
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  punchTimeValue: {
    ...Typography.heading,
    fontSize: moderateScale(12),
    color: Colors.text,
    marginTop: moderateScale(1),
  },
  logBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workHoursContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
  },
  workHoursText: {
    ...Typography.caption,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  workHoursValue: {
    ...Typography.heading,
    fontSize: moderateScale(13),
    color: Colors.primary,
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
});

export default MyAttendanceScreen;

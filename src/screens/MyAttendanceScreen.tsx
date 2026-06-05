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
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Ionicons from '../icons/Ionicons';
import AppCard from '../components/AppCard';
import { Colors, Theme } from '../theme/colors';
import { Typography } from '../theme/typography';
import { moderateScale } from '../utils/responsive';
import { getAttendanceHistory, AttendanceHistoryDay } from '../services/attendance';

const MyAttendanceScreen = ({ navigation }: any) => {
  const [history, setHistory] = useState<AttendanceHistoryDay[]>([]);
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

  const presentCount = useMemo(() => {
    return history.filter(day => {
      const inPunch = day.records.find(r => r.Punch === 'Check IN');
      if (!inPunch) return false;
      const dateObj = new Date(inPunch.PunchDatetime);
      const hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();
      const isLate = hours > 9 || (hours === 9 && minutes > 15);
      return !isLate;
    }).length;
  }, [history]);

  const lateCount = useMemo(() => {
    return history.filter(day => {
      const inPunch = day.records.find(r => r.Punch === 'Check IN');
      if (!inPunch) return false;
      const dateObj = new Date(inPunch.PunchDatetime);
      const hours = dateObj.getHours();
      const minutes = dateObj.getMinutes();
      return hours > 9 || (hours === 9 && minutes > 15);
    }).length;
  }, [history]);

  const absentCount = 0;

  const summaryCards = useMemo(() => [
    { label: 'Present', value: String(presentCount).padStart(2, '0'), icon: 'checkmark-circle-outline', tone: Colors.success },
    { label: 'Late', value: String(lateCount).padStart(2, '0'), icon: 'time-outline', tone: Colors.warning },
    { label: 'Absent', value: String(absentCount).padStart(2, '0'), icon: 'close-circle-outline', tone: Colors.error },
  ], [presentCount, lateCount]);

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

  const getDayStatus = (day: AttendanceHistoryDay) => {
    const inPunch = day.records.find(r => r.Punch === 'Check IN');
    if (!inPunch) return 'Absent';
    const dateObj = new Date(inPunch.PunchDatetime);
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    return (hours > 9 || (hours === 9 && minutes > 15)) ? 'Late' : 'Present';
  };

  const getDayTimeRange = (day: AttendanceHistoryDay) => {
    const inPunch = day.records.find(r => r.Punch === 'Check IN');
    const outPunch = [...day.records].reverse().find(r => r.Punch === 'Check OUT');

    if (!inPunch) return 'No records';

    const formatTime = (isoString: string) => {
      try {
        const date = new Date(isoString);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch {
        return '--:--';
      }
    };

    const inTime = formatTime(inPunch.PunchDatetime);
    const outTime = outPunch ? formatTime(outPunch.PunchDatetime) : 'Active';

    return `${inTime} - ${outTime}`;
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
          contentContainerStyle={styles.content}
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
            <View style={styles.insightIcon}>
              <Ionicons name="time-outline" size={moderateScale(24)} color={Colors.primary} />
            </View>
            <View style={styles.insightCopy}>
              <Text style={styles.insightTitle}>Average work hours</Text>
              <Text style={styles.insightText}>
                You are averaging {averageWorkHours} per working day this month.
              </Text>
            </View>
          </AppCard>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Logs</Text>
            <Text style={styles.sectionAction}>This month</Text>
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={moderateScale(40)} color={Colors.borderStrong} />
              <Text style={styles.emptyText}>No attendance records found for this month.</Text>
            </View>
          ) : (
            history.map((log, index) => {
              const statusVal = getDayStatus(log);
              const isLate = statusVal === 'Late';

              return (
                <AppCard key={index} style={styles.logCard}>
                  <View style={[styles.logAccentDot, { backgroundColor: isLate ? Colors.warning : Colors.success }]} />
                  <View style={styles.logBody}>
                    <Text style={styles.logDate}>{formatDate(log.date)}</Text>
                    <Text style={styles.logTime}>{getDayTimeRange(log)}</Text>
                  </View>
                  <View style={styles.logMeta}>
                    <View style={[styles.statusPill, { backgroundColor: isLate ? 'rgba(255, 179, 0, 0.1)' : 'rgba(16, 185, 129, 0.1)' }]}>
                      <Text style={[styles.logStatus, { color: isLate ? Colors.warning : Colors.success }]}>
                        {statusVal}
                      </Text>
                    </View>
                    <Text style={styles.logHours}>{log.totalWork}</Text>
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
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  insightIcon: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(254, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCopy: {
    flex: 1,
  },
  insightTitle: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
  },
  insightText: {
    ...Typography.caption,
    marginTop: moderateScale(4),
    lineHeight: moderateScale(18),
    color: Colors.textSecondary,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.sm,
  },
  logAccentDot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
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
  logTime: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    marginTop: moderateScale(2),
  },
  logMeta: {
    alignItems: 'flex-end',
  },
  statusPill: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: Theme.borderRadius.pill,
    marginBottom: moderateScale(4),
  },
  logStatus: {
    ...Typography.label,
    fontSize: moderateScale(10),
    fontWeight: '800',
  },
  logHours: {
    ...Typography.heading,
    fontSize: moderateScale(13),
    color: Colors.text,
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

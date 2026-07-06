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
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ABSENT'>('ALL');

  const handleDownloadReport = async () => {
    try {
      const session = await getAuthSession();
      const empId = session?.user?.fkEmpId;
      if (!empId) {
        Alert.alert('Error', 'Employee ID not found in session.');
        return;
      }
      await downloadReport('/api/mobile/attendance/report', 'attendance_report.pdf', empId);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to download report.');
    }
  };

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
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 6);
    const endDate = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    const startDate = oneWeekAgo.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return `${startDate} - ${endDate}`;
  }, []);

  const getDayStatus = useCallback((day: AttendanceHistoryDay) => {
    let inPunch = day.records?.find(r => r.Punch === 'Check IN');
    if (!inPunch && day.records && day.records.length > 0) {
      inPunch = day.records[day.records.length - 1]; // Fallback to earliest punch of the day
    }
    if (!inPunch) return 'Absent';
    const dateObj = new Date(inPunch.PunchDatetime);
    const hours = dateObj.getHours();
    const minutes = dateObj.getMinutes();
    return (hours > 9 || (hours === 9 && minutes > 15)) ? 'Late' : 'Present';
  }, []);

  const completeHistory = useMemo(() => {
    if (history.length === 0) return [];

    const historyMap = new Map<string, AttendanceHistoryDay>();
    history.forEach(day => {
      historyMap.set(day.date, day);
    });

    const resultList: AttendanceHistoryDay[] = [];
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 6); // Last 7 days including today

    const currentDateIter = new Date(oneWeekAgo);
    while (currentDateIter <= today) {
      const year = currentDateIter.getFullYear();
      const month = String(currentDateIter.getMonth() + 1).padStart(2, '0');
      const dateVal = String(currentDateIter.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dateVal}`;

      const dayOfWeek = currentDateIter.getDay();

      if (historyMap.has(dateStr)) {
        resultList.push(historyMap.get(dateStr)!);
      } else {
        if (dayOfWeek !== 0) {
          resultList.push({
            date: dateStr,
            totalWork: '00h 00m',
            totalBreak: '00h 00m',
            records: [],
          });
        }
      }

      currentDateIter.setDate(currentDateIter.getDate() + 1);
    }

    return resultList.reverse();
  }, [history]);

  const currentMonthDays = useMemo(() => {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 6);
    
    const calendarDays = [];
    const currentDateIter = new Date(oneWeekAgo);
    
    while (currentDateIter <= today) {
      const year = currentDateIter.getFullYear();
      const month = String(currentDateIter.getMonth() + 1).padStart(2, '0');
      const day = currentDateIter.getDate();
      const dateStr = `${year}-${month}-${String(day).padStart(2, '0')}`;
      const dayData = completeHistory.find(d => d.date === dateStr);
      
      calendarDays.push({ 
        day, 
        date: dateStr, 
        isEmpty: false,
        data: dayData 
      });
      
      currentDateIter.setDate(currentDateIter.getDate() + 1);
    }
    
    return calendarDays;
  }, [completeHistory]);

  const presentCount = useMemo(() => {
    return completeHistory.filter(day => {
      const status = getDayStatus(day);
      return status === 'Present' || status === 'Late';
    }).length;
  }, [completeHistory, getDayStatus]);

  const lateCount = useMemo(() => {
    return completeHistory.filter(day => {
      const status = getDayStatus(day);
      return status === 'Late';
    }).length;
  }, [completeHistory, getDayStatus]);

  const absentCount = useMemo(() => {
    return completeHistory.filter(day => {
      const status = getDayStatus(day);
      return status === 'Absent';
    }).length;
  }, [completeHistory, getDayStatus]);

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

  const totalWorkHours = useMemo(() => {
    let totalMinutes = 0;

    history.forEach(day => {
      const match = day.totalWork.match(/(\d+)h\s+(\d+)m/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const mins = parseInt(match[2], 10);
        totalMinutes += hours * 60 + mins;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hours}h ${String(mins).padStart(2, '0')}m`;
  }, [history]);

  const attendanceRate = useMemo(() => {
    const totalWorkingDays = completeHistory.filter(day => {
      const status = getDayStatus(day);
      return status !== 'Absent' || day.records && day.records.length > 0;
    }).length;
    if (totalWorkingDays === 0) return '0%';
    const rate = ((presentCount + lateCount) / totalWorkingDays) * 100;
    return `${rate.toFixed(1)}%`;
  }, [completeHistory, presentCount, lateCount, getDayStatus]);

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
    return completeHistory.filter(day => {
      const status = getDayStatus(day);
      if (activeFilter === 'ALL') return true;
      if (activeFilter === 'PRESENT') return status === 'Present' || status === 'Late';
      if (activeFilter === 'LATE') return status === 'Late';
      if (activeFilter === 'ABSENT') return status === 'Absent';
      return true;
    });
  }, [completeHistory, activeFilter, getDayStatus]);

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
    let inPunch = day.records?.find(r => r.Punch === 'Check IN');
    if (!inPunch && day.records && day.records.length > 0) {
      inPunch = day.records[day.records.length - 1]; // Fallback to earliest punch of the day
    }
    const outPunch = day.records ? [...day.records].reverse().find(r => r.Punch === 'Check OUT') : undefined;
    return { inPunch, outPunch };
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Custom AppBar */}
      <AppBar title="My Attendance" showBackButton onBackPress={() => navigation.goBack()} />

      {/* Stunning Background Banner */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(254, 0, 0, 0.15)', 'rgba(254, 0, 0, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: moderateScale(120) + insets.bottom }]}>
          {/* Monthly Analytics Shimmer */}
          <View style={styles.analyticsSection}>
            <View style={styles.analyticsHeader}>
              <Shimmer width="40%" height={moderateScale(18)} borderRadius={4} />
              <View style={{ flexDirection: 'row', gap: Theme.spacing.sm }}>
                <Shimmer width={moderateScale(80)} height={moderateScale(24)} borderRadius={moderateScale(8)} />
                <Shimmer width={moderateScale(60)} height={moderateScale(24)} borderRadius={moderateScale(8)} />
              </View>
            </View>

            <View style={styles.analyticsCardsRow}>
              {[1, 2].map(i => (
                <View key={i} style={[styles.analyticsCard, { padding: Theme.spacing.lg, alignItems: 'center' }]}>
                  <Shimmer width={moderateScale(40)} height={moderateScale(40)} borderRadius={moderateScale(12)} style={{ marginBottom: Theme.spacing.sm }} />
                  <Shimmer width="50%" height={moderateScale(28)} borderRadius={4} style={{ marginBottom: Theme.spacing.xs }} />
                  <Shimmer width="60%" height={moderateScale(10)} borderRadius={2} style={{ marginBottom: Theme.spacing.xs }} />
                  <Shimmer width="40%" height={moderateScale(10)} borderRadius={2} />
                </View>
              ))}
            </View>
          </View>

          {/* Calendar Shimmer */}
          <View style={styles.calendarSection}>
            <View style={styles.calendarHeader}>
              <Shimmer width="30%" height={moderateScale(16)} borderRadius={4} />
              <Shimmer width={moderateScale(100)} height={moderateScale(20)} borderRadius={moderateScale(12)} />
            </View>
            <View style={styles.calendarGrid}>
              {[...Array(35)].map((_, i) => (
                <View key={i} style={styles.calendarDay}>
                  <Shimmer width={moderateScale(12)} height={moderateScale(12)} borderRadius={2} />
                </View>
              ))}
            </View>
          </View>

          {/* Shift Information Shimmer */}
          <View style={styles.shiftSection}>
            <Shimmer width="30%" height={moderateScale(16)} borderRadius={4} style={{ marginBottom: Theme.spacing.md }} />
            
            {[1, 2, 3, 4, 5].map(i => (
              <View key={i} style={[styles.shiftCard, { padding: Theme.spacing.lg, marginBottom: Theme.spacing.md }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Theme.spacing.md }}>
                  <Shimmer width="30%" height={moderateScale(14)} borderRadius={4} />
                  <Shimmer width={moderateScale(60)} height={moderateScale(20)} borderRadius={moderateScale(12)} />
                </View>
                <View style={{ gap: Theme.spacing.md }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm }}>
                    <Shimmer width={moderateScale(16)} height={moderateScale(16)} borderRadius={moderateScale(8)} />
                    <Shimmer width="40%" height={moderateScale(12)} borderRadius={2} />
                    <Shimmer width="20%" height={moderateScale(12)} borderRadius={2} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm }}>
                    <Shimmer width={moderateScale(16)} height={moderateScale(16)} borderRadius={moderateScale(8)} />
                    <Shimmer width="40%" height={moderateScale(12)} borderRadius={2} />
                    <Shimmer width="20%" height={moderateScale(12)} borderRadius={2} />
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: Theme.spacing.sm }}>
                    <Shimmer width={moderateScale(16)} height={moderateScale(16)} borderRadius={moderateScale(8)} />
                    <Shimmer width="40%" height={moderateScale(12)} borderRadius={2} />
                    <Shimmer width="20%" height={moderateScale(12)} borderRadius={2} />
                  </View>
                </View>
              </View>
            ))}
          </View>
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
          {/* Monthly Analytics Section */}
          <View style={styles.analyticsSection}>
            <View style={styles.analyticsHeader}>
              <View style={styles.analyticsTitleContainer}>
                <Text style={styles.analyticsTitle}>Weekly Analytics</Text>
                <Text style={styles.analyticsSubtitle}>Last 7 Days</Text>
              </View>
              <View style={styles.analyticsActions}>
                <TouchableOpacity style={styles.iconButton} activeOpacity={0.7} onPress={handleDownloadReport}>
                  <Ionicons name="download-outline" size={moderateScale(20)} color={Colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
                  <Ionicons name="ellipsis-horizontal" size={moderateScale(20)} color={Colors.text} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.analyticsCardsRow}>
              {/* Present Rate Card */}
              <View style={[styles.analyticsCard, styles.presentCard]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="checkmark-circle" size={moderateScale(16)} color={Colors.success} />
                  </View>
                  <Text style={styles.cardLabel}>PRESENT RATE</Text>
                </View>
                <Text style={styles.cardPercentage}>{attendanceRate}</Text>
                <View style={styles.cardProgress}>
                  <View style={[styles.cardProgressBar, { width: `${parseFloat(attendanceRate)}%` }]} />
                </View>
                <Text style={styles.cardSublabel}>Compliance</Text>
              </View>

              {/* Late Punches Card */}
              <View style={[styles.analyticsCard, styles.lateCard]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="warning" size={moderateScale(16)} color={Colors.accent} />
                  </View>
                  <Text style={styles.cardLabel}>LATE PUNCHES</Text>
                </View>
                <Text style={styles.cardPercentage}>{String(lateCount).padStart(2, '0')}</Text>
                <View style={styles.cardProgress}>
                  <View style={[styles.cardProgressBar, styles.cardProgressBarLate, { width: `${Math.min(lateCount * 10, 100)}%` }]} />
                </View>
                {lateCount > 0 && (
                  <TouchableOpacity style={styles.needsAttentionButton} activeOpacity={0.7}>
                    <Text style={styles.needsAttentionText}>Needs attention</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          {/* Calendar Section */}
          <View style={styles.calendarSection}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>{currentMonthName}</Text>
              <View style={styles.streakBadge}>
                <Ionicons name="flame" size={moderateScale(14)} color={Colors.accent} />
                <Text style={styles.streakText}>Daily streak active</Text>
              </View>
            </View>
            <View style={styles.calendarGrid}>
              {currentMonthDays.map((day, index) => {
                if (day.isEmpty) {
                  return <View key={index} style={styles.calendarDay} />;
                }
                
                const status = day.data ? getDayStatus(day.data) : null;
                const isToday = day.date === new Date().toISOString().split('T')[0];
                const isPresent = status === 'Present';
                const isAbsent = status === 'Absent';
                const isLate = status === 'Late';
                
                return (
                  <View key={index} style={styles.calendarDay}>
                    <Text style={[styles.dayNumber, isToday && styles.dayNumberToday]}>
                      {day.day}
                    </Text>
                    {(isPresent || isAbsent || isLate) && (
                      <View style={[
                        styles.dayDot,
                        isPresent && styles.dayDotPresent,
                        isAbsent && styles.dayDotAbsent,
                        isLate && styles.dayDotLate
                      ]} />
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          {/* Shift Information Section */}
          <View style={styles.shiftSection}>
            <Text style={styles.shiftSectionTitle}>Shift Information</Text>
            
            {filteredHistory.slice(0, 5).map((log, index) => {
              const statusVal = getDayStatus(log);
              const { inPunch, outPunch } = getDailyPunches(log);
              const inTime = inPunch ? formatTime(inPunch.PunchDatetime) : '--:--';
              const outTime = outPunch ? formatTime(outPunch.PunchDatetime) : '--:--';
              const dateObj = new Date(log.date);
              const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              
              return (
                <View key={index} style={styles.shiftCard}>
                  <View style={styles.shiftCardHeader}>
                    <Text style={styles.shiftDate}>{formattedDate}</Text>
                    <View style={[styles.shiftStatusBadge, statusVal === 'Absent' ? styles.shiftStatusAbsent : statusVal === 'Late' ? styles.shiftStatusLate : styles.shiftStatusCompleted]}>
                      <Text style={styles.shiftStatusText}>{statusVal}</Text>
                    </View>
                  </View>
                  <View style={styles.shiftDetails}>
                    <View style={styles.shiftDetailRow}>
                      <Ionicons name="time" size={moderateScale(16)} color={Colors.textSecondary} />
                      <Text style={styles.shiftDetailLabel}>Shift Started</Text>
                      <Text style={styles.shiftDetailValue}>{inTime}</Text>
                    </View>
                    {outPunch && (
                      <View style={styles.shiftDetailRow}>
                        <Ionicons name="log-out" size={moderateScale(16)} color={Colors.success} />
                        <Text style={styles.shiftDetailLabel}>Punched Out</Text>
                        <Text style={styles.shiftDetailValue}>{outTime}</Text>
                      </View>
                    )}
                    <View style={styles.shiftDetailRow}>
                      <Ionicons name="hourglass" size={moderateScale(16)} color={Colors.primary} />
                      <Text style={styles.shiftDetailLabel}>Total Hours</Text>
                      <Text style={styles.shiftDetailValue}>{log.totalWork}</Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
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
  analyticsSection: {
    marginTop: Theme.spacing.md,
  },
  analyticsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  analyticsTitleContainer: {
    flexDirection: 'column',
  },
  analyticsTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  analyticsSubtitle: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginTop: moderateScale(2),
  },
  analyticsActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  iconButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    borderRadius: moderateScale(8),
  },
  downloadButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(11),
    color: Colors.primary,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(2),
  },
  viewDetailsText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(11),
    color: Colors.primary,
  },
  analyticsCardsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  analyticsCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  presentCard: {
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  lateCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.2)',
  },
  cardIconContainer: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(6),
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  cardPercentage: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: moderateScale(24),
    color: Colors.text,
    marginBottom: Theme.spacing.xs,
  },
  cardProgress: {
    width: '100%',
    height: moderateScale(4),
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: moderateScale(2),
    marginBottom: Theme.spacing.xs,
    overflow: 'hidden',
  },
  cardProgressBar: {
    height: '100%',
    backgroundColor: Colors.success,
    borderRadius: moderateScale(2),
  },
  cardProgressBarLate: {
    backgroundColor: Colors.accent,
  },
  cardLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(9),
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  cardSublabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(8),
    color: Colors.success,
  },
  needsAttentionButton: {
    marginTop: Theme.spacing.sm,
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    borderRadius: moderateScale(6),
    alignSelf: 'flex-start',
  },
  needsAttentionText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(9),
    color: Colors.accent,
  },
  calendarSection: {
    marginTop: Theme.spacing.lg,
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: Theme.spacing.lg,
    ...Theme.shadow.sm,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  calendarTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.text,
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    borderRadius: moderateScale(12),
  },
  streakText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(10),
    color: Colors.accent,
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDay: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNumber: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(12),
    color: Colors.text,
  },
  dayNumberToday: {
    color: Colors.primary,
    fontWeight: '700',
  },
  dayDot: {
    width: moderateScale(6),
    height: moderateScale(6),
    borderRadius: moderateScale(3),
    marginTop: moderateScale(2),
  },
  dayDotPresent: {
    backgroundColor: Colors.success,
  },
  dayDotAbsent: {
    backgroundColor: '#EF4444',
  },
  dayDotLate: {
    backgroundColor: Colors.accent,
  },
  shiftSection: {
    marginTop: Theme.spacing.lg,
  },
  shiftSectionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.text,
    marginBottom: Theme.spacing.md,
  },
  shiftCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  shiftCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  shiftDate: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  shiftStatusBadge: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(12),
  },
  shiftStatusActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  shiftStatusCompleted: {
    backgroundColor: 'rgba(100, 116, 139, 0.1)',
  },
  shiftStatusAbsent: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  shiftStatusLate: {
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
  },
  shiftStatusText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(10),
    color: Colors.textSecondary,
  },
  shiftDetails: {
    gap: moderateScale(12),
  },
  shiftDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  shiftDetailLabel: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  shiftDetailValue: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(12),
    color: Colors.text,
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

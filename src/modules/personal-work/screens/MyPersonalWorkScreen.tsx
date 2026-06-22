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
import AppBar from '../../../components/AppBar';
import AppCard from '../../../components/AppCard';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { getPersonalWorkHistory, PersonalWorkRequest } from '../services/personal-work.service';

const statusTone: Record<string, { color: string; bg: string; icon: string }> = {
  Pending: { color: Colors.warning, bg: 'rgba(255, 179, 0, 0.10)', icon: 'time-outline' },
  Authorized: { color: Colors.success, bg: 'rgba(16, 185, 129, 0.10)', icon: 'checkmark-circle-outline' },
  Approved: { color: Colors.success, bg: 'rgba(16, 185, 129, 0.10)', icon: 'checkmark-circle-outline' },
  Rejected: { color: Colors.error, bg: 'rgba(239, 68, 68, 0.10)', icon: 'close-circle-outline' },
  Added: { color: Colors.warning, bg: 'rgba(255, 179, 0, 0.10)', icon: 'time-outline' },
};

const formatDate = (value: string) => {
  try {
    const date = new Date(value);
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

const formatTime = (value: string) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const MyPersonalWorkScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [history, setHistory] = useState<PersonalWorkRequest[]>([]);
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
      const response = await getPersonalWorkHistory();
      setHistory(response.data || []);
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

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const summary = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    history.forEach(item => {
      const status = item.last_status || 'Pending';
      if (status === 'Pending' || status === 'Added') {
        counts.pending++;
      } else if (status === 'Authorized' || status === 'Approved') {
        counts.approved++;
      } else if (status === 'Rejected') {
        counts.rejected++;
      }
    });
    return counts;
  }, [history]);

  const summaryCards = useMemo(
    () => [
      {
        label: 'Pending',
        value: String(summary.pending).padStart(2, '0'),
        icon: 'time-outline',
        tone: Colors.warning,
      },
      {
        label: 'Approved',
        value: String(summary.approved).padStart(2, '0'),
        icon: 'checkmark-circle-outline',
        tone: Colors.success,
      },
      {
        label: 'Rejected',
        value: String(summary.rejected).padStart(2, '0'),
        icon: 'close-circle-outline',
        tone: Colors.error,
      },
    ],
    [summary],
  );

  const totalMinutes = useMemo(() => {
    return history
      .filter(item => item.last_status === 'Authorized' || item.last_status === 'Approved')
      .reduce((total, item) => total + item.break_time, 0);
  }, [history]);

  const openApplyPersonalWork = () => {
    navigation.navigate('ApplyPersonalWork');
  };

  const getStatusLabel = (status: string) => {
    if (status === 'Added') return 'Pending';
    if (status === 'Authorized') return 'Approved';
    return status;
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Custom AppBar */}
      <AppBar title="Personal Work" showBackButton onBackPress={() => navigation.goBack()} />

      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.15)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

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
              <Ionicons name="timer-outline" size={moderateScale(24)} color={Colors.primary} />
            </View>
            <View style={styles.insightCopy}>
              <Text style={styles.insightTitle}>Total Personal Time</Text>
              <Text style={styles.insightText}>
                You have taken {Math.round(totalMinutes)} minutes of personal work time.
              </Text>
            </View>
          </AppCard>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Requests History</Text>
            <TouchableOpacity onPress={openApplyPersonalWork} activeOpacity={0.85}>
              <Text style={styles.sectionAction}>Apply Request</Text>
            </TouchableOpacity>
          </View>

          {history.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={moderateScale(40)} color={Colors.borderStrong} />
              <Text style={styles.emptyText}>No requests found yet.</Text>
              <TouchableOpacity style={styles.emptyButton} onPress={openApplyPersonalWork} activeOpacity={0.85}>
                <Text style={styles.emptyButtonText}>Apply for Personal Work</Text>
              </TouchableOpacity>
            </View>
          ) : (
            history.map(item => {
              const status = item.last_status || 'Pending';
              const tone = statusTone[status] || statusTone.Pending;
              const displayStatus = getStatusLabel(status);
              return (
                <TouchableOpacity
                  key={item.pk_pw_id}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('PersonalWorkDetails', { pk_pw_id: item.pk_pw_id })}
                >
                  <AppCard style={styles.logCard}>
                    <View style={[styles.logAccentBar, { backgroundColor: tone.color }]} />
                    <View style={styles.logContent}>
                      <View style={styles.logBody}>
                        <Text style={styles.logDate}>{formatDate(item.request_date)}</Text>
                        <Text style={styles.logTime}>
                          {formatTime(item.leaving_time)} - {formatTime(item.return_time)}
                        </Text>
                        {item.reason ? (
                          <Text style={styles.logReason} numberOfLines={1}>
                            {item.reason}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.logMeta}>
                        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                          <Text style={[styles.logStatus, { color: tone.color }]}>{displayStatus}</Text>
                        </View>
                        <Text style={styles.logMinutes}>
                          {item.break_time} mins
                        </Text>
                      </View>
                    </View>
                  </AppCard>
                </TouchableOpacity>
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
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(40),
    right: -moderateScale(60),
    width: moderateScale(250),
    height: moderateScale(250),
    borderRadius: moderateScale(125),
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
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
  yearLabel: {
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
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0,
    ...Theme.shadow.md,
  },
  insightIcon: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
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
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0,
    overflow: 'hidden',
    ...Theme.shadow.md,
  },
  logAccentBar: {
    width: moderateScale(4),
  },
  logContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
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
  logReason: {
    ...Typography.caption,
    color: Colors.textMuted,
    marginTop: moderateScale(4),
    textTransform: 'none',
    letterSpacing: 0,
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
  logMinutes: {
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
});

export default MyPersonalWorkScreen;

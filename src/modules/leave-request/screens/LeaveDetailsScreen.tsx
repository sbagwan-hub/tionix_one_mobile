import React, { useEffect } from 'react';
import {
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
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppBar from '../../../components/AppBar';
import AppCard from '../../../components/AppCard';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { LeaveRequest, LeaveStatus } from '../services/leave';
import Toast from 'react-native-toast-message';
import { downloadReport } from '../../../utils/reportDownloader';
import { Share } from 'react-native';

const statusTone: Record<LeaveStatus, { color: string; bg: string; icon: string; label: string }> = {
  Pending: { color: Colors.warning, bg: 'rgba(255, 179, 0, 0.10)', icon: 'time-outline', label: 'STATUS PENDING' },
  Approved: { color: Colors.success, bg: 'rgba(16, 185, 129, 0.10)', icon: 'checkmark-circle-outline', label: 'STATUS APPROVED' },
  Rejected: { color: Colors.error, bg: 'rgba(239, 68, 68, 0.10)', icon: 'close-circle-outline', label: 'STATUS REJECTED' },
  Cancelled: { color: Colors.textSecondary, bg: 'rgba(148, 163, 184, 0.12)', icon: 'ban-outline', label: 'STATUS CANCELLED' },
};

const formatDate = (value: string) => {
  try {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
};

const formatAppliedDate = (value: string) => {
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
};

const getDatesInRange = (startStr: string, endStr: string) => {
  if (!startStr || !endStr) return [];
  const start = new Date(`${startStr}T00:00:00`);
  const end = new Date(`${endStr}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return [];
  }

  const items: string[] = [];
  const current = new Date(start);
  while (current <= end) {
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');
    items.push(`${year}-${month}-${day}`);
    current.setDate(current.getDate() + 1);
  }
  return items;
};

const LeaveDetailsScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { leaveItem } = route.params as { leaveItem: LeaveRequest };
  const tone = statusTone[leaveItem.status] || statusTone.Pending;
  const dates = getDatesInRange(leaveItem.startDate, leaveItem.endDate);

  useEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this leave request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: () => {
            Toast.show({
              type: 'success',
              text1: 'Request Cancelled',
              text2: 'Cancellation request sent to supervisor successfully.',
              position: 'top',
              topOffset: 60,
            });
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleDownloadReport = async () => {
    if (leaveItem.status !== 'Approved') {
      Alert.alert('Approval Pending', 'Your leave request is still pending HR approval. You can download the report once it is approved.');
      return;
    }
    try {
      await downloadReport(`/api/mobile/leave-requests/${leaveItem.id}/report`, `leave_${leaveItem.id}.pdf`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to download report.');
    }
  };

  const handleShare = async () => {
    try {
      const message = `Leave Request Details:\n\nID: #${leaveItem.id.slice(-6).toUpperCase()}\nType: ${leaveItem.leaveType}\nDuration: ${leaveItem.days} Day${leaveItem.days === 1 ? '' : 's'}\nFrom: ${formatDate(leaveItem.startDate)}\nTo: ${formatDate(leaveItem.endDate)}\nStatus: ${leaveItem.status}`;
      await Share.share({
        message,
      });
    } catch (error: any) {
      Alert.alert('Error', 'Failed to share leave details.');
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Custom AppBar */}
      <AppBar title="Leave Details" showBackButton onBackPress={() => navigation.goBack()} />

      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.15)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + moderateScale(80) }]}
      >
        {/* Status Card */}
        <AppCard style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIconFrame, { backgroundColor: tone.bg }]}>
              <Ionicons name={tone.icon as any} size={moderateScale(28)} color={tone.color} />
            </View>
            <View style={styles.statusInfo}>
              <Text style={[styles.statusLabel, { color: tone.color }]}>{tone.label}</Text>
              <Text style={styles.statusSubtext}>Reviewing Request</Text>
            </View>
          </View>
          <View style={styles.statusDivider} />
          <View style={styles.statusFooter}>
            <Ionicons name="calendar-outline" size={moderateScale(14)} color={Colors.textSecondary} />
            <Text style={styles.submittedText}>Submitted {formatAppliedDate(leaveItem.appliedOn)}</Text>
          </View>
        </AppCard>

        {/* Leave Info Cards */}
        <View style={styles.infoCardsRow}>
          <AppCard style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>LEAVE TYPE</Text>
            <Text style={styles.infoCardValue}>{leaveItem.leaveType}</Text>
          </AppCard>
          <AppCard style={styles.infoCard}>
            <Text style={styles.infoCardLabel}>DURATION</Text>
            <Text style={styles.infoCardValue}>{leaveItem.days.toFixed(1)} Days</Text>
          </AppCard>
        </View>

        <AppCard style={styles.timeframeCard}>
          <Text style={styles.infoCardLabel}>TIMEFRAME</Text>
          <Text style={styles.timeframeValue}>{formatDate(leaveItem.startDate)} — {formatDate(leaveItem.endDate)}</Text>
        </AppCard>

        {/* Schedule Breakdown */}
        {dates.length > 0 && (
          <AppCard style={styles.scheduleCard}>
            <View style={styles.scheduleHeader}>
              <Text style={styles.sectionTitle}>Schedule Breakdown</Text>
              <View style={styles.unitsBadge}>
                <Text style={styles.unitsBadgeText}>{dates.length} UNITS</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.rangeDaysContainer}>
              {dates.map((dateStr) => {
                const dateObj = new Date(`${dateStr}T00:00:00`);
                const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
                const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                return (
                  <View key={dateStr} style={styles.rangeDayRow}>
                    <View style={styles.rangeDayInfo}>
                      <View style={styles.rangeDayTextGroup}>
                        <Text style={styles.rangeDayLabel}>{dateLabel} {dayLabel}</Text>
                        <Text style={styles.rangeDateLabel}>Full Working Day</Text>
                      </View>
                    </View>
                    <View style={styles.rangeDayBadges}>
                      <View style={styles.rangePill}>
                        <Text style={styles.rangePillText}>
                          {leaveItem.isHalfDay ? 'HALF DAY' : 'FULL DAY'}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </AppCard>
        )}

        {/* Employee Remarks */}
        <AppCard style={styles.remarksCard}>
          <Text style={styles.sectionTitle}>Employee Remarks</Text>
          <View style={styles.divider} />
          <View style={styles.remarksBox}>
            <Text style={styles.remarksText}>
              {leaveItem.reason || 'No reason specified for this request.'}
            </Text>
          </View>
        </AppCard>

        {/* Manager Feedback */}
        <AppCard style={styles.feedbackCard}>
          <Text style={styles.sectionTitle}>Manager Feedback</Text>
          <View style={styles.divider} />
          <View style={styles.feedbackBox}>
            <Text style={styles.feedbackText}>
              {leaveItem.managerComment || 'Awaiting manager\'s comment...'}
            </Text>
          </View>
        </AppCard>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.pdfButton}
            onPress={handleDownloadReport}
            activeOpacity={0.8}
          >
            <Ionicons name="document-text-outline" size={moderateScale(18)} color={Colors.primary} />
            <Text style={styles.pdfButtonText}>PDF</Text>
          </TouchableOpacity>
          {leaveItem.status === 'Pending' && (
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancelRequest}
              activeOpacity={0.8}
            >
              <Ionicons name="close-outline" size={moderateScale(18)} color={Colors.error} />
              <Text style={styles.cancelButtonText}>Cancel Request</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
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
    height: moderateScale(260),
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
    backgroundColor: 'rgba(255, 179, 0, 0.12)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(40),
    right: -moderateScale(60),
    width: moderateScale(250),
    height: moderateScale(250),
    borderRadius: moderateScale(125),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
  },
  header: {
    backgroundColor: 'transparent',
    paddingBottom: Theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  iconButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(10),
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  profilePicture: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  statusCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
  },
  statusIconFrame: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    letterSpacing: 1,
  },
  statusSubtext: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontSize: moderateScale(12),
    marginTop: 2,
  },
  statusDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Theme.spacing.sm,
  },
  statusFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
  },
  submittedText: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: moderateScale(11),
  },
  infoCardsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  infoCard: {
    flex: 1,
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  infoCardLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: moderateScale(10),
    letterSpacing: 0.5,
  },
  infoCardValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.text,
    marginTop: 4,
  },
  timeframeCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  timeframeValue: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(14),
    color: Colors.text,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Theme.spacing.sm,
  },
  scheduleCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  scheduleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  unitsBadge: {
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(12),
  },
  unitsBadgeText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(10),
    color: Colors.primary,
  },
  remarksCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  remarksBox: {
    backgroundColor: Colors.surfaceMuted,
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
  },
  remarksText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontSize: moderateScale(13),
  },
  feedbackCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  feedbackBox: {
    backgroundColor: 'rgba(255, 77, 28, 0.05)',
    padding: Theme.spacing.md,
    borderRadius: Theme.borderRadius.md,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  feedbackText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontSize: moderateScale(13),
    fontStyle: 'italic',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  pdfButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: moderateScale(12),
  },
  pdfButtonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.white,
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    borderColor: Colors.error,
    borderWidth: 1.5,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: moderateScale(12),
    backgroundColor: Colors.white,
  },
  cancelButtonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.error,
  },
  daysListCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  rangeDaysContainer: {
    gap: 8,
  },
  rangeDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  rangeDayInfo: {
    flex: 1,
  },
  rangeDayTextGroup: {
    flexDirection: 'column',
  },
  rangeDayLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(13),
    color: Colors.text,
  },
  rangeDateLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    marginTop: 1,
  },
  rangeDayBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  rangePill: {
    backgroundColor: Colors.surfaceMuted,
    paddingVertical: moderateScale(3),
    paddingHorizontal: moderateScale(8),
    borderRadius: moderateScale(10),
  },
  rangePillText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(10),
    color: Colors.textSecondary,
  },
});

export default LeaveDetailsScreen;

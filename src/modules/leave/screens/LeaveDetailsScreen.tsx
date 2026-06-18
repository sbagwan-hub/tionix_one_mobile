import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppCard from '../../../components/AppCard';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { LeaveRequest, LeaveStatus } from '../services/leave';
import Toast from 'react-native-toast-message';
import { downloadReport } from '../../../utils/reportDownloader';

const statusTone: Record<LeaveStatus, { color: string; bg: string; icon: string }> = {
  Pending: { color: Colors.warning, bg: 'rgba(255, 179, 0, 0.10)', icon: 'time-outline' },
  Approved: { color: Colors.success, bg: 'rgba(16, 185, 129, 0.10)', icon: 'checkmark-circle-outline' },
  Rejected: { color: Colors.error, bg: 'rgba(239, 68, 68, 0.10)', icon: 'close-circle-outline' },
  Cancelled: { color: Colors.textSecondary, bg: 'rgba(148, 163, 184, 0.12)', icon: 'ban-outline' },
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.15)', 'rgba(255, 77, 28, 0.0)']}
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
          <Text style={styles.headerTitle}>Request Details</Text>
          <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadReport}>
            <Ionicons name="download-outline" size={moderateScale(22)} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.requestNoLabel}>ID: #{leaveItem.id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.headerSubtitle}>Details of your applied leave record.</Text>
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + moderateScale(80) }]}
      >
        {/* Status Card */}
        <AppCard style={styles.statusCard}>
          <View style={[styles.statusIconFrame, { backgroundColor: tone.bg }]}>
            <Ionicons name={tone.icon as any} size={moderateScale(24)} color={tone.color} />
          </View>
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Request Status</Text>
            <Text style={[styles.statusText, { color: tone.color }]}>{leaveItem.status}</Text>
          </View>
        </AppCard>

        {/* Details Grid Card */}
        <AppCard style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Leave Period & Type</Text>
          
          <View style={styles.divider} />

          <View style={styles.detailsGrid}>
            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Leave Type</Text>
                <Text style={styles.gridValue}>{leaveItem.leaveType}</Text>
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Duration</Text>
                <Text style={styles.gridValue}>
                  {leaveItem.days} Day{leaveItem.days === 1 ? '' : 's'}
                </Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>From Date</Text>
                <Text style={styles.gridValue}>{formatDate(leaveItem.startDate)}</Text>
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>To Date</Text>
                <Text style={styles.gridValue}>{formatDate(leaveItem.endDate)}</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Working Type</Text>
                <Text style={styles.gridValue}>
                  {leaveItem.isHalfDay ? 'Half Day' : 'Full Day'}
                </Text>
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Applied On</Text>
                <Text style={styles.gridValue}>{formatAppliedDate(leaveItem.appliedOn)}</Text>
              </View>
            </View>
          </View>
        </AppCard>

        {/* Days in Range List Card */}
        {dates.length > 0 && (
          <AppCard style={styles.daysListCard}>
            <Text style={styles.sectionTitle}>Days Included</Text>
            <View style={styles.divider} />
            <View style={styles.rangeDaysContainer}>
              {dates.map((dateStr) => {
                const dateObj = new Date(`${dateStr}T00:00:00`);
                const dayLabel = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                const dateLabel = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                
                return (
                  <View key={dateStr} style={styles.rangeDayRow}>
                    <View style={styles.rangeDayInfo}>
                      <View style={styles.checkmarkIcon}>
                        <Ionicons name="checkmark-circle" size={16} color={Colors.primary} />
                      </View>
                      <View style={styles.rangeDayTextGroup}>
                        <Text style={styles.rangeDayLabel}>{dayLabel}</Text>
                        <Text style={styles.rangeDateLabel}>{dateLabel}</Text>
                      </View>
                    </View>
                    <View style={styles.rangeDayBadges}>
                      <View style={styles.rangePill}>
                        <Text style={styles.rangePillText}>
                          {leaveItem.isHalfDay ? 'Half Day' : 'Full Day'}
                        </Text>
                      </View>
                      <View style={[styles.rangePill, { backgroundColor: 'rgba(255, 77, 28, 0.08)' }]}>
                        <Text style={[styles.rangePillText, { color: Colors.primary }]}>
                          {leaveItem.leaveType.replace(' Leave', '')}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </AppCard>
        )}

        {/* Reason Card */}
        <AppCard style={styles.reasonCard}>
          <Text style={styles.sectionTitle}>Justification / Reason</Text>
          <View style={styles.divider} />
          <Text style={styles.reasonText}>
            {leaveItem.reason || 'No reason specified for this request.'}
          </Text>
        </AppCard>

        {/* Cancel Action Button (Only show if Pending) */}
        {leaveItem.status === 'Pending' && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelRequest}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={moderateScale(18)} color={Colors.error} />
            <Text style={styles.cancelButtonText}>Cancel Leave Request</Text>
          </TouchableOpacity>
        )}
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
  downloadButton: {
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
  requestNoLabel: {
    ...Typography.heading,
    color: Colors.text,
    fontSize: moderateScale(30),
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: moderateScale(2),
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  statusIconFrame: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: moderateScale(11),
  },
  statusText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    marginTop: 2,
  },
  detailsCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
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
  detailsGrid: {
    gap: Theme.spacing.md,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridCol: {
    flex: 1,
  },
  gridLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: moderateScale(10),
  },
  gridValue: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(14),
    color: Colors.text,
    marginTop: 2,
  },
  reasonCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  reasonText: {
    ...Typography.body,
    color: Colors.textSecondary,
    lineHeight: 22,
    fontSize: moderateScale(13),
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Theme.spacing.xs,
    borderColor: Colors.error,
    borderWidth: 1.5,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: moderateScale(12),
    marginTop: Theme.spacing.sm,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  checkmarkIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rangeDayTextGroup: {
    flexDirection: 'column',
  },
  rangeDayLabel: {
    fontFamily: 'Outfit_700Bold',
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

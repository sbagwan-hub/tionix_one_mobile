import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import Toast from 'react-native-toast-message';
import AppCard from '../../../components/AppCard';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import {
  deletePersonalWorkRequest,
  getPersonalWorkDetails,
  PersonalWorkRequest,
} from '../services/personalWork.service';

const statusTone: Record<string, { color: string; bg: string; icon: string }> = {
  Pending: { color: Colors.warning, bg: 'rgba(255, 179, 0, 0.10)', icon: 'time-outline' },
  Authorized: { color: Colors.success, bg: 'rgba(16, 185, 129, 0.10)', icon: 'checkmark-circle-outline' },
  Approved: { color: Colors.success, bg: 'rgba(16, 185, 129, 0.10)', icon: 'checkmark-circle-outline' },
  Rejected: { color: Colors.error, bg: 'rgba(239, 68, 68, 0.10)', icon: 'close-circle-outline' },
  Added: { color: Colors.warning, bg: 'rgba(255, 179, 0, 0.10)', icon: 'time-outline' },
};

const formatDate = (value: string | null) => {
  if (!value) return '-';
  try {
    const date = new Date(value);
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

const formatTime = (value: string | null) => {
  if (!value) return '-';
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

const formatTimestamp = (value: string | null) => {
  if (!value) return '-';
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

const PersonalWorkDetailsScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { pk_pw_id } = route.params as { pk_pw_id: number };

  const [request, setRequest] = useState<PersonalWorkRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getPersonalWorkDetails(pk_pw_id);
      setRequest(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [pk_pw_id]);

  const handleCancelRequest = () => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this personal work request?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deletePersonalWorkRequest(pk_pw_id);
              Toast.show({
                type: 'success',
                text1: 'Request Cancelled',
                text2: 'Personal work request cancelled successfully.',
              });
              navigation.goBack();
            } catch (err: any) {
              Toast.show({
                type: 'error',
                text1: 'Failed to Cancel',
                text2: err.message || 'Server error occurred.',
              });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (error || !request) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={moderateScale(48)} color={Colors.error} />
        <Text style={styles.errorText}>{error || 'Failed to load request.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDetails}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const status = request.last_status || 'Pending';
  const tone = statusTone[status] || statusTone.Pending;
  const isPending = status === 'Pending' || status === 'Added';
  const displayStatus = status === 'Added' ? 'Pending' : status === 'Authorized' ? 'Approved' : status;

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
            <Text style={[styles.statusText, { color: tone.color }]}>{displayStatus}</Text>
          </View>
        </AppCard>

        {/* Details Grid Card */}
        <AppCard style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Break Information</Text>
          <View style={styles.divider} />

          <View style={styles.detailsGrid}>
            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Request Date</Text>
                <Text style={styles.gridValue}>{formatDate(request.request_date)}</Text>
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Duration</Text>
                <Text style={styles.gridValue}>{request.break_time} Minutes</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Leaving Time</Text>
                <Text style={styles.gridValue}>{formatTime(request.leaving_time)}</Text>
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Return Time</Text>
                <Text style={styles.gridValue}>{formatTime(request.return_time)}</Text>
              </View>
            </View>

            <View style={styles.gridRow}>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Applied On</Text>
                <Text style={styles.gridValue}>{formatTimestamp(request.date_timestamp)}</Text>
              </View>
              <View style={styles.gridCol}>
                <Text style={styles.gridLabel}>Sync Status</Text>
                <Text style={styles.gridValue}>{request.sync === 'Y' ? 'Synced' : 'Pending Sync'}</Text>
              </View>
            </View>
          </View>
        </AppCard>

        {/* Reason Card */}
        <AppCard style={styles.reasonCard}>
          <Text style={styles.sectionTitle}>Reason / Justification</Text>
          <View style={styles.divider} />
          <Text style={styles.reasonText}>
            {request.reason || 'No reason specified.'}
          </Text>
        </AppCard>

        {/* Authorization / Supervisor Review details */}
        {!isPending && (
          <AppCard style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Supervisor Review</Text>
            <View style={styles.divider} />

            <View style={styles.detailsGrid}>
              <View style={styles.gridRow}>
                <View style={styles.gridCol}>
                  <Text style={styles.gridLabel}>Reviewed By</Text>
                  <Text style={styles.gridValue}>{request.authorized_by_name || 'Supervisor'}</Text>
                </View>
                <View style={styles.gridCol}>
                  <Text style={styles.gridLabel}>Review Date</Text>
                  <Text style={styles.gridValue}>{formatTimestamp(request.a_timestamp)}</Text>
                </View>
              </View>

              <View style={styles.gridRow}>
                <View style={[styles.gridCol, { flex: 2 }]}>
                  <Text style={styles.gridLabel}>Remarks / Feedback</Text>
                  <Text style={styles.gridValue}>{request.remarks || 'No remarks provided.'}</Text>
                </View>
              </View>
            </View>
          </AppCard>
        )}

        {/* Cancel Action Button (Only show if Pending) */}
        {isPending && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelRequest}
            disabled={isDeleting}
            activeOpacity={0.8}
          >
            <Ionicons name="trash-outline" size={moderateScale(18)} color={Colors.error} />
            <Text style={styles.cancelButtonText}>
              {isDeleting ? 'Cancelling...' : 'Cancel Request'}
            </Text>
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
});

export default PersonalWorkDetailsScreen;

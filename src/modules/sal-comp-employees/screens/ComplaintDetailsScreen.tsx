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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppBar from '../../../components/AppBar';
import AppCard from '../../../components/AppCard';
import Toast from 'react-native-toast-message';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { getComplaintDetails, deleteComplaint, Complaint, ComplaintType, COMPLAINT_TYPE_LABELS, COMPLAINT_TYPE_COLORS, COMPLAINT_TYPE_ICONS } from '../services/complaints.service';
import { getAuthSession } from '../../auth/services/auth';
import { documentDirectory, downloadAsync } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../../../config/api';

const getInitials = (name: string) => {
  if (!name) return '';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getFileIconName = (docType: string) => {
  const type = docType.toLowerCase();
  if (type === 'pdf') return 'document-text-outline';
  if (['png', 'jpg', 'jpeg'].includes(type)) return 'image-outline';
  if (['mp4', 'mov', 'mkv', 'avi'].includes(type)) return 'videocam-outline';
  if (['doc', 'docx'].includes(type)) return 'document-outline';
  if (['xls', 'xlsx', 'csv'].includes(type)) return 'grid-outline';
  return 'document-attach-outline';
};

const getFileIconColor = (docType: string) => {
  const type = docType.toLowerCase();
  if (type === 'pdf') return '#EF4444'; // Red
  if (['png', 'jpg', 'jpeg'].includes(type)) return '#10B981'; // Green
  if (['mp4', 'mov', 'mkv', 'avi'].includes(type)) return '#8B5CF6'; // Purple
  if (['doc', 'docx'].includes(type)) return '#3B82F6'; // Blue
  if (['xls', 'xlsx', 'csv'].includes(type)) return '#059669'; // Emerald
  return '#6B7280';
};

const getDocTypeBg = (docType: string) => {
  const type = docType.toLowerCase();
  if (type === 'pdf') return 'rgba(239, 68, 68, 0.08)';
  if (['png', 'jpg', 'jpeg'].includes(type)) return 'rgba(16, 185, 129, 0.08)';
  if (['mp4', 'mov', 'mkv', 'avi'].includes(type)) return 'rgba(139, 92, 246, 0.08)'; // Purple bg
  if (['doc', 'docx'].includes(type)) return 'rgba(59, 130, 246, 0.08)';
  if (['xls', 'xlsx', 'csv'].includes(type)) return 'rgba(5, 150, 105, 0.08)';
  return 'rgba(107, 114, 128, 0.08)';
};

const getMimeType = (docType: string) => {
  const type = docType.toLowerCase();
  if (type === 'pdf') return 'application/pdf';
  if (type === 'png') return 'image/png';
  if (['jpg', 'jpeg'].includes(type)) return 'image/jpeg';
  if (type === 'mp4') return 'video/mp4';
  if (type === 'mov') return 'video/quicktime';
  if (type === 'avi') return 'video/x-msvideo';
  if (type === 'doc' || type === 'docx') return 'application/msword';
  if (type === 'xls' || type === 'xlsx') return 'application/vnd.ms-excel';
  if (type === 'csv') return 'text/csv';
  return 'application/octet-stream';
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

const ComplaintDetailsScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { pk_com_id } = route.params as { pk_com_id: string };

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedInEmpId, setLoggedInEmpId] = useState<number | null>(null);

  const fetchDetails = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getComplaintDetails(pk_com_id);
      setComplaint(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch complaint details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const session = await getAuthSession();
        if (session?.user?.fkEmpId) {
          setLoggedInEmpId(Number(session.user.fkEmpId));
        }
      } catch (err) {
        console.error('Failed to get auth session:', err);
      }
    })();
    fetchDetails();
  }, [pk_com_id]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Complaint',
      'Are you sure you want to delete this complaint record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteComplaint(pk_com_id);
              Toast.show({
                type: 'success',
                text1: 'Deleted',
                text2: 'Complaint has been successfully removed.',
              });
              navigation.goBack();
            } catch (err: any) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.message || 'Failed to delete complaint.',
              });
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const handleDownloadAttachment = async (file_name: string, file_path: string, doc_type: string) => {
    try {
      let url = file_path;
      if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
        const baseUrl = API_BASE_URL.replace(/\/$/, '');
        const cleanPath = url.startsWith('/') ? url : `/${url}`;
        url = `${baseUrl}${cleanPath}`;
      }

      if (url.startsWith('file://')) {
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(url, {
            mimeType: getMimeType(doc_type),
            dialogTitle: `View ${file_name}`,
          });
        } else {
          Alert.alert('Error', 'Sharing is not available on this device.');
        }
        return;
      }

      Toast.show({
        type: 'info',
        text1: 'Downloading File',
        text2: `Downloading ${file_name}...`,
        position: 'top',
      });

      const token = await AsyncStorage.getItem('@attendance/access-token');
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const destPath = `${documentDirectory}${Date.now()}_${file_name}`;
      const downloadRes = await downloadAsync(url, destPath, { headers });

      if (downloadRes.status !== 200) {
        throw new Error(`Server responded with status ${downloadRes.status}`);
      }

      Toast.show({
        type: 'success',
        text1: 'Download Complete',
        text2: `${file_name} downloaded successfully.`,
        position: 'top',
      });

      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(downloadRes.uri, {
          mimeType: getMimeType(doc_type),
          dialogTitle: `Open ${file_name}`,
        });
      } else {
        Alert.alert('Preview Failed', 'Sharing is not available on this device.');
      }
    } catch (error: any) {
      console.error('Download error:', error);
      Toast.show({
        type: 'error',
        text1: 'Download Failed',
        text2: error.message || 'Unable to open file.',
        position: 'top',
      });
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading details...</Text>
      </View>
    );
  }

  if (error || !complaint) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={moderateScale(48)} color={Colors.error} />
        <Text style={styles.errorText}>{error || 'Failed to load complaint.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDetails}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const filteredEmployees = complaint.employees
    ? complaint.employees.filter((emp) => emp.pk_emp_id !== loggedInEmpId)
    : [];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Custom AppBar */}
      <AppBar
        title="Complaint Details"
        showBackButton
        onBackPress={() => navigation.goBack()}
        rightComponent={
          <TouchableOpacity
            onPress={handleDelete}
            style={styles.deleteIconContainer}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={moderateScale(20)} color={Colors.error} />
          </TouchableOpacity>
        }
      />

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
        {/* Info Card */}
        <AppCard style={styles.detailsCard}>
          <View style={styles.headerInfo}>
            {/* Date + Type row */}
            <View style={styles.headerTopRow}>
              <View style={styles.dateRow}>
                <Ionicons name="calendar-outline" size={moderateScale(14)} color={Colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.dateText}>{formatTimestamp(complaint.created_at)}</Text>
              </View>
              {/* Type Badge */}
              {(() => {
                const type = (complaint.type || 'complaint') as ComplaintType;
                const tc = COMPLAINT_TYPE_COLORS[type];
                const ti = COMPLAINT_TYPE_ICONS[type];
                const tl = COMPLAINT_TYPE_LABELS[type];
                return (
                  <View style={[styles.typeBadge, { backgroundColor: tc.bg, borderColor: tc.border }]}>
                    <Ionicons name={ti as any} size={moderateScale(11)} color={tc.text} />
                    <Text style={[styles.typeBadgeText, { color: tc.text }]}>{tl}</Text>
                  </View>
                );
              })()}
            </View>
            <Text style={styles.complaintTitle}>{complaint.title}</Text>
          </View>
        </AppCard>

        {/* Description Card */}
        <AppCard style={styles.detailsCard}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.divider} />
          <Text style={styles.descriptionText}>
            {complaint.description || 'No description provided.'}
          </Text>
        </AppCard>

        {/* Linked Staff Card */}
        {filteredEmployees.length > 0 && (
          <AppCard style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Linked Staff</Text>
            <View style={styles.divider} />
            <View style={styles.badgesContainer}>
              {filteredEmployees.map((emp) => (
                <View key={emp.pk_emp_id} style={styles.empBadge}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{getInitials(emp.employee)}</Text>
                  </View>
                  <Text style={styles.badgeText}>
                    {emp.employee} <Text style={styles.badgeCode}>({emp.emp_code})</Text>
                  </Text>
                </View>
              ))}
            </View>
          </AppCard>
        )}

        {/* Attachments Card */}
        {complaint.attachments && complaint.attachments.length > 0 && (
          <AppCard style={styles.detailsCard}>
            <Text style={styles.sectionTitle}>Attachments ({complaint.attachments.length})</Text>
            <View style={styles.divider} />
            <View style={styles.filesContainer}>
              {complaint.attachments.map((att) => (
                <TouchableOpacity
                  key={att.pk_att_id}
                  style={styles.fileRow}
                  activeOpacity={0.7}
                  onPress={() => handleDownloadAttachment(att.file_name, att.file_path, att.doc_type)}
                >
                  <View style={[styles.fileIconContainer, { backgroundColor: getDocTypeBg(att.doc_type) }]}>
                    <Ionicons name={getFileIconName(att.doc_type) as any} size={moderateScale(14)} color={getFileIconColor(att.doc_type)} />
                  </View>
                  <Text style={styles.fileText} numberOfLines={1}>
                    {att.file_name}
                  </Text>
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="eye-outline" size={moderateScale(16)} color={Colors.primary} />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </AppCard>
        )}
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
    backgroundColor: 'rgba(255, 179, 0, 0.08)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(40),
    right: -moderateScale(60),
    width: moderateScale(250),
    height: moderateScale(250),
    borderRadius: moderateScale(125),
    backgroundColor: 'rgba(255, 77, 28, 0.06)',
  },
  deleteIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  detailsCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Theme.shadow.md,
  },
  headerInfo: {
    gap: Theme.spacing.xs,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: moderateScale(4),
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(10),
    borderWidth: 1,
  },
  typeBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(11),
    textTransform: 'capitalize',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(12),
    color: Colors.textMuted,
  },
  complaintTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(18),
    color: Colors.text,
    lineHeight: moderateScale(24),
  },
  sectionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: Theme.spacing.sm,
  },
  descriptionText: {
    fontFamily: 'Outfit_400Regular',
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    lineHeight: moderateScale(22),
  },
  badgesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: moderateScale(8),
  },
  empBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 28, 0.05)',
    paddingRight: moderateScale(10),
    paddingLeft: moderateScale(4),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(20),
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 28, 0.12)',
    gap: moderateScale(6),
  },
  avatarCircle: {
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    color: Colors.white,
  },
  badgeText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
  },
  badgeCode: {
    color: Colors.textMuted,
    fontFamily: 'Outfit_450',
  },
  filesContainer: {
    gap: moderateScale(8),
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(10),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: moderateScale(10),
  },
  fileIconContainer: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    flex: 1,
  },
  actionIconContainer: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontFamily: 'Outfit_500Medium',
    color: Colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    gap: Theme.spacing.md,
    backgroundColor: '#F8FAFC',
  },
  errorText: {
    fontFamily: 'Outfit_500Medium',
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
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.white,
  },
});

export default ComplaintDetailsScreen;

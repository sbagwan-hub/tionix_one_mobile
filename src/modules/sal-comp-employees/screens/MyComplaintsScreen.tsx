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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppBar from '../../../components/AppBar';
import AppCard from '../../../components/AppCard';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { getComplaints, deleteComplaint, Complaint, ComplaintType, COMPLAINT_TYPE_LABELS, COMPLAINT_TYPE_COLORS, COMPLAINT_TYPE_ICONS } from '../services/complaints.service';
import { getAuthSession } from '../../auth/services/auth';
import Toast from 'react-native-toast-message';
import { ScrollView as HorizontalScroll } from 'react-native';

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

const MyComplaintsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loggedInEmpId, setLoggedInEmpId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<ComplaintType | 'all'>('all');

  // Load employee ID on mount to filter linked staff display
  useEffect(() => {
    (async () => {
      try {
        const session = await getAuthSession();
        if (session?.user?.fkEmpId) {
          setLoggedInEmpId(Number(session.user.fkEmpId));
        }
      } catch (err) {
        console.error('Failed to fetch auth session:', err);
      }
    })();
  }, []);

  const fetchComplaints = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await getComplaints();
      setComplaints(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the server.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Handle focus changes (reload when navigating back)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchComplaints(true);
    });
    return unsubscribe;
  }, [navigation, fetchComplaints]);

  const handleDelete = (id: string) => {
    Alert.alert(
      'Delete Complaint',
      'Are you sure you want to delete this complaint record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteComplaint(id);
              Toast.show({
                type: 'success',
                text1: 'Deleted',
                text2: 'Complaint has been successfully removed.',
              });
              fetchComplaints(true);
            } catch (err: any) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: err.message || 'Failed to delete complaint.',
              });
            }
          },
        },
      ]
    );
  };

  const totalAttachments = useMemo(() => {
    return complaints.reduce((sum, c) => sum + (c.attachments?.length || 0), 0);
  }, [complaints]);

  const totalEmployees = useMemo(() => {
    const uniqueIds = new Set<number>();
    complaints.forEach((c) => {
      c.employees?.forEach((e) => uniqueIds.add(e.pk_emp_id));
    });
    return uniqueIds.size;
  }, [complaints]);

  // Filtered list based on active type filter
  const filteredComplaints = useMemo(() => {
    if (activeFilter === 'all') return complaints;
    return complaints.filter((c) => (c.type || 'complaint') === activeFilter);
  }, [complaints, activeFilter]);

  // Count per type for badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: complaints.length };
    complaints.forEach((c) => {
      const t = c.type || 'complaint';
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [complaints]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Custom AppBar */}
      <AppBar title="My Complaints" showBackButton onBackPress={() => navigation.goBack()} />

      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.12)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading complaints...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={moderateScale(48)} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchComplaints()}>
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
              onRefresh={() => fetchComplaints(true)}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          {/* Summary Row */}
          <View style={styles.summaryRow}>
            <AppCard style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(255, 77, 28, 0.08)' }]}>
                <Ionicons name="alert-circle-outline" size={moderateScale(20)} color={Colors.primary} />
              </View>
              <Text style={styles.summaryValue}>{String(complaints.length).padStart(2, '0')}</Text>
              <Text style={styles.summaryLabel}>Total Logs</Text>
            </AppCard>

            <AppCard style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
                <Ionicons name="people-outline" size={moderateScale(20)} color={Colors.success} />
              </View>
              <Text style={styles.summaryValue}>{String(totalEmployees).padStart(2, '0')}</Text>
              <Text style={styles.summaryLabel}>Linked Staff</Text>
            </AppCard>

            <AppCard style={styles.summaryCard}>
              <View style={[styles.summaryIcon, { backgroundColor: 'rgba(59, 130, 246, 0.08)' }]}>
                <Ionicons name="attach-outline" size={moderateScale(20)} color="#3B82F6" />
              </View>
              <Text style={styles.summaryValue}>{String(totalAttachments).padStart(2, '0')}</Text>
              <Text style={styles.summaryLabel}>Attachments</Text>
            </AppCard>
          </View>

          {/* Section Header */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Logs History</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ApplyComplaint')} activeOpacity={0.9}>
              <LinearGradient
                colors={Colors.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.sectionActionBtn}
              >
                <Ionicons name="add" size={moderateScale(12)} color={Colors.white} />
                <Text style={styles.sectionActionText}>FILE NEW</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Type Filter Chips */}
          <HorizontalScroll
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {/* All chip */}
            <TouchableOpacity
              style={[
                styles.filterChip,
                activeFilter === 'all' && styles.filterChipActive,
              ]}
              onPress={() => setActiveFilter('all')}
              activeOpacity={0.75}
            >
              <Ionicons
                name="apps-outline"
                size={moderateScale(12)}
                color={activeFilter === 'all' ? Colors.white : Colors.textMuted}
              />
              <Text style={[
                styles.filterChipText,
                activeFilter === 'all' && styles.filterChipTextActive,
              ]}>
                All
              </Text>
              {typeCounts['all'] > 0 ? (
                <View style={[
                  styles.filterChipCount,
                  activeFilter === 'all' && styles.filterChipCountActive,
                ]}>
                  <Text style={[
                    styles.filterChipCountText,
                    activeFilter === 'all' && { color: Colors.white },
                  ]}>
                    {typeCounts['all']}
                  </Text>
                </View>
              ) : null}
            </TouchableOpacity>

            {/* Type-specific chips */}
            {(['complaint', 'suggestion', 'feedback', 'appraisal'] as ComplaintType[]).map((type) => {
              const isActive = activeFilter === type;
              const typeColors = COMPLAINT_TYPE_COLORS[type];
              const count = typeCounts[type] || 0;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.filterChip,
                    isActive && {
                      backgroundColor: typeColors.bg,
                      borderColor: typeColors.border,
                    },
                  ]}
                  onPress={() => setActiveFilter(type)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={COMPLAINT_TYPE_ICONS[type] as any}
                    size={moderateScale(12)}
                    color={isActive ? typeColors.text : Colors.textMuted}
                  />
                  <Text style={[
                    styles.filterChipText,
                    isActive && { color: typeColors.text, fontFamily: 'Outfit_700Bold' },
                  ]}>
                    {COMPLAINT_TYPE_LABELS[type]}
                  </Text>
                  {count > 0 ? (
                    <View style={[
                      styles.filterChipCount,
                      isActive && { backgroundColor: typeColors.text },
                    ]}>
                      <Text style={[
                        styles.filterChipCountText,
                        isActive && { color: Colors.white },
                      ]}>
                        {count}
                      </Text>
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </HorizontalScroll>

          {filteredComplaints.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconContainer}>
                <Ionicons
                  name={activeFilter === 'all' ? 'folder-open-outline' : (COMPLAINT_TYPE_ICONS[activeFilter] as any)}
                  size={moderateScale(28)}
                  color="#94A3B8"
                />
              </View>
              <Text style={styles.emptyText}>
                {activeFilter === 'all' ? 'No logs filed yet.' : `No ${COMPLAINT_TYPE_LABELS[activeFilter]}s`}
              </Text>
              <Text style={styles.emptySubtext}>
                {activeFilter === 'all'
                  ? 'File your first complaint, suggestion, or feedback.'
                  : `You haven't filed any ${COMPLAINT_TYPE_LABELS[activeFilter].toLowerCase()}s yet.`}
              </Text>
              <TouchableOpacity
                style={styles.emptyButton}
                onPress={() =>
                  activeFilter === 'all'
                    ? navigation.navigate('ApplyComplaint')
                    : setActiveFilter('all')
                }
                activeOpacity={0.8}
              >
                <Text style={styles.emptyButtonText}>
                  {activeFilter === 'all' ? 'File a Log Now' : 'Show All Logs'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredComplaints.map((item) => (
              <AppCard key={item.pk_com_id} style={styles.logCard}>
                <View style={styles.logContent}>
                  <View style={styles.logBody}>
                    <View style={styles.titleRow}>
                      <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={moderateScale(13)} color={Colors.textMuted} style={{ marginRight: 4 }} />
                        <Text style={styles.logDate}>{formatDate(item.created_at)}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDelete(item.pk_com_id)}
                        style={styles.deleteIconContainer}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="trash-outline" size={moderateScale(15)} color={Colors.error} />
                      </TouchableOpacity>
                    </View>

                    {/* Type Badge */}
                    {(() => {
                      const type = item.type || 'complaint';
                      const typeColors = COMPLAINT_TYPE_COLORS[type];
                      const typeLabel = COMPLAINT_TYPE_LABELS[type];
                      const typeIcon = COMPLAINT_TYPE_ICONS[type];
                      return (
                        <View style={[styles.typeBadge, { backgroundColor: typeColors.bg, borderColor: typeColors.border }]}>
                          <Ionicons name={typeIcon as any} size={moderateScale(10)} color={typeColors.text} />
                          <Text style={[styles.typeBadgeText, { color: typeColors.text }]}>{typeLabel}</Text>
                        </View>
                      );
                    })()}
                    
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() => navigation.navigate('ComplaintDetails', { pk_com_id: item.pk_com_id })}
                    >
                      <Text style={styles.complaintTitle}>{item.title}</Text>
                      {item.description ? (
                        <Text style={styles.logReason} numberOfLines={2}>{item.description}</Text>
                      ) : null}

                      {/* Linked Employees Section */}
                      {(() => {
                        const filteredEmployees = item.employees
                          ? item.employees.filter((emp) => emp.pk_emp_id !== loggedInEmpId)
                          : [];
                        if (filteredEmployees.length === 0) return null;
                        return (
                          <View style={styles.employeesList}>
                            <Text style={styles.subHeading}>Linked Staff</Text>
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
                          </View>
                        );
                      })()}

                      {/* Attachments Section */}
                      {item.attachments && item.attachments.length > 0 ? (
                        <View style={styles.attachmentsList}>
                          <Text style={styles.subHeading}>Attachments ({item.attachments.length})</Text>
                          <View style={styles.filesContainer}>
                            {item.attachments.map((att) => (
                              <View key={att.pk_att_id} style={styles.fileRow}>
                                <View style={[styles.fileIconContainer, { backgroundColor: getDocTypeBg(att.doc_type) }]}>
                                  <Ionicons name={getFileIconName(att.doc_type) as any} size={moderateScale(12)} color={getFileIconColor(att.doc_type)} />
                                </View>
                                <Text style={styles.fileText} numberOfLines={1}>
                                  {att.file_name}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  </View>
                </View>
              </AppCard>
            ))
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
    backgroundColor: 'rgba(255, 179, 0, 0.06)',
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
    gap: Theme.spacing.md,
  },
  filterRow: {
    marginHorizontal: -Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: moderateScale(4),
    gap: moderateScale(8),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(5),
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(7),
    borderRadius: moderateScale(20),
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(12),
    color: Colors.textMuted,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  filterChipCount: {
    backgroundColor: '#E2E8F0',
    borderRadius: moderateScale(8),
    minWidth: moderateScale(18),
    height: moderateScale(18),
    paddingHorizontal: moderateScale(5),
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipCountActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  filterChipCountText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    color: Colors.textMuted,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: moderateScale(16),
    backgroundColor: Colors.white,
    borderRadius: moderateScale(20),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  summaryIcon: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(8),
  },
  summaryValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(22),
    color: Colors.text,
  },
  summaryLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: Colors.textMuted,
    marginTop: moderateScale(2),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
  },
  sectionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  sectionActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    paddingVertical: moderateScale(6),
    paddingHorizontal: moderateScale(12),
    borderRadius: moderateScale(12),
    ...Theme.shadow.sm,
  },
  sectionActionText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    color: Colors.white,
    letterSpacing: 0.5,
  },
  logCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(18),
    borderWidth: 0,
    borderLeftWidth: moderateScale(4),
    borderLeftColor: Colors.primary,
    overflow: 'hidden',
    ...Theme.shadow.md,
  },
  logContent: {
    padding: Theme.spacing.lg,
  },
  logBody: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(6),
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logDate: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(12),
    color: Colors.textMuted,
  },
  deleteIconContainer: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  complaintTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.text,
    lineHeight: moderateScale(22),
  },
  logReason: {
    fontFamily: 'Outfit_400Regular',
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
    marginTop: moderateScale(8),
    lineHeight: moderateScale(20),
  },
  subHeading: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(11),
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: moderateScale(14),
    marginBottom: moderateScale(8),
  },
  employeesList: {
    marginTop: moderateScale(4),
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
  attachmentsList: {
    marginTop: moderateScale(4),
  },
  filesContainer: {
    gap: moderateScale(6),
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(8),
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: moderateScale(8),
  },
  fileIconContainer: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(6),
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    flex: 1,
  },
  docTypeBadge: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(4),
  },
  docTypeBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    color: Colors.textMuted,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: moderateScale(4),
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(3),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    marginBottom: moderateScale(6),
    marginTop: moderateScale(4),
  },
  typeBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(10),
    textTransform: 'capitalize',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.sm,
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
  emptyContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(20),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    paddingVertical: moderateScale(36),
    paddingHorizontal: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Theme.spacing.md,
  },
  emptyIconContainer: {
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(14),
  },
  emptyText: {
    fontFamily: 'Outfit_700Bold',
    color: '#475569',
    fontSize: moderateScale(15),
  },
  emptySubtext: {
    fontFamily: 'Outfit_400Regular',
    color: '#94A3B8',
    fontSize: moderateScale(12),
    textAlign: 'center',
    marginTop: moderateScale(4),
    marginBottom: moderateScale(12),
    paddingHorizontal: moderateScale(10),
  },
  emptyButton: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: moderateScale(10),
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
  },
  emptyButtonText: {
    fontFamily: 'Outfit_700Bold',
    color: Colors.primary,
    fontSize: moderateScale(13),
  },
});

export default MyComplaintsScreen;

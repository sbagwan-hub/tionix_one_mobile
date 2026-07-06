import React, { useCallback, useState, useEffect } from 'react';
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
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppCard from '../../../components/AppCard';
import Shimmer from '../../../components/Shimmer';
import AppBar from '../../../components/AppBar';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { getDailyTasks, updateTaskStatus, DailyTask, TaskStatus } from '../services/daily-task.service';

const statusConfig: Record<TaskStatus, { color: string; bg: string; icon: string; activeBg?: string }> = {
  Pending: { color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.10)', icon: 'time-outline', activeBg: 'rgba(245, 158, 11, 0.20)' },
  Canceled: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.10)', icon: 'close-circle-outline', activeBg: 'rgba(239, 68, 68, 0.20)' },
  Finished: { color: '#10B981', bg: 'rgba(16, 185, 129, 0.10)', icon: 'checkmark-circle-outline', activeBg: 'rgba(16, 185, 129, 0.20)' },
};

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

const formatTime = (timeStr: string) => {
  if (!timeStr) return '';
  if (timeStr.includes('T') && timeStr.includes(':')) {
    try {
      const dateObj = new Date(timeStr);
      if (!isNaN(dateObj.getTime())) {
        const hh = String(dateObj.getHours()).padStart(2, '0');
        const mm = String(dateObj.getMinutes()).padStart(2, '0');
        return `${hh}:${mm}`;
      }
    } catch {}
  }
  return timeStr;
};

const isFutureOrToday = (dateStr: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate >= today;
  } catch {
    return false;
  }
};

const isPastDate = (dateStr: string) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateStr);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  } catch {
    return false;
  }
};

const priorityConfig: Record<'High' | 'Medium' | 'Low', { color: string; bg: string; activeBg?: string }> = {
  High: { color: '#EF4444', bg: 'rgba(239, 68, 68, 0.08)', activeBg: 'rgba(239, 68, 68, 0.18)' },
  Medium: { color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.08)', activeBg: 'rgba(59, 130, 246, 0.18)' },
  Low: { color: '#6B7280', bg: 'rgba(107, 114, 128, 0.08)', activeBg: 'rgba(107, 114, 128, 0.18)' },
};

const TaskCard = ({ task, onStatusChange, onPress }: { task: DailyTask; onStatusChange: (taskId: number, status: TaskStatus) => void; onPress: () => void }) => {
  const config = statusConfig[task.status];
  const isRemaining = task.status === 'Pending' && isFutureOrToday(task.reaching_date);
  const isPassed = task.status === 'Pending' && isPastDate(task.reaching_date);
  const dateColor = isRemaining ? '#10B981' : (isPassed ? '#EF4444' : Colors.textSecondary);
  const valueColor = isRemaining ? '#10B981' : (isPassed ? '#EF4444' : Colors.text);

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      <View style={styles.taskCard}>
        <View style={styles.taskCardHeader}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {task.task_name}
          </Text>
          <View style={{ flexDirection: 'row', gap: moderateScale(6), alignItems: 'center' }}>
            <View style={[styles.statusBadge, { backgroundColor: priorityConfig[task.priority || 'Medium'].bg }]}>
              <Text style={[styles.statusText, { color: priorityConfig[task.priority || 'Medium'].color, fontSize: moderateScale(10) }]}>{task.priority || 'Medium'}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
              <Text style={[styles.statusText, { color: config.color, fontSize: moderateScale(10) }]}>{task.status}</Text>
            </View>
          </View>
        </View>
        <View style={styles.taskDetails}>
          <View style={styles.taskDetailRow}>
            <Ionicons name="calendar-outline" size={moderateScale(16)} color={dateColor} />
            <Text style={[styles.taskDetailLabel, { color: dateColor }]}>Due Date</Text>
            <Text style={[styles.taskDetailValue, { color: valueColor }]}>{formatDate(task.reaching_date)}</Text>
          </View>
          <View style={styles.taskDetailRow}>
            <Ionicons name="time-outline" size={moderateScale(16)} color={Colors.textSecondary} />
            <Text style={styles.taskDetailLabel}>Due Time</Text>
            <Text style={styles.taskDetailValue}>{formatTime(task.reaching_time)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const DailyTaskScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [filterStatus, setFilterStatus] = useState<TaskStatus | undefined>(undefined);
  const [filterPriority, setFilterPriority] = useState<'High' | 'Medium' | 'Low' | undefined>(undefined);
  const [filterTimeframe, setFilterTimeframe] = useState<'7days' | '1month' | 'custom' | undefined>(undefined);
  const [filterStartDate, setFilterStartDate] = useState<string | undefined>(undefined);
  const [filterEndDate, setFilterEndDate] = useState<string | undefined>(undefined);

  // Filter UI Modals and Pickers
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDatePickerVal, setStartDatePickerVal] = useState(new Date());
  const [endDatePickerVal, setEndDatePickerVal] = useState(new Date());

  const fetchTasks = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await getDailyTasks({
        status: filterStatus,
        priority: filterPriority,
        timeframe: filterTimeframe,
        startDate: filterStartDate,
        endDate: filterEndDate,
      });
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the server.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus, filterPriority, filterTimeframe, filterStartDate, filterEndDate]);

  useFocusEffect(
    useCallback(() => {
      fetchTasks();
    }, [fetchTasks])
  );

  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      const unsubscribe = parent.addListener('focus', () => {
        fetchTasks(true);
      });
      return unsubscribe;
    }
  }, [navigation, fetchTasks]);

  const handleStatusChange = async (taskId: number, status: TaskStatus) => {
    try {
      await updateTaskStatus(taskId, status);
      setTasks(prev => prev.map(task => task.pk_task_id === taskId ? { ...task, status } : task));
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleAddTask = () => {
    navigation.navigate('AddDailyTask');
  };

  const handleEditTask = (task: DailyTask) => {
    navigation.navigate('EditDailyTask', { task });
  };

  const summary = {
    pending: tasks.filter(t => t.status === 'Pending').length,
    canceled: tasks.filter(t => t.status === 'Canceled').length,
    finished: tasks.filter(t => t.status === 'Finished').length,
  };

  const completionRate = tasks.length > 0 ? ((summary.finished / tasks.length) * 100).toFixed(1) : '0';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <AppBar title="Daily Task" showBackButton={false} />

      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.15)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: moderateScale(120) + insets.bottom }]}>
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

          {[1, 2, 3].map(i => (
            <View key={i} style={[styles.taskCard, { padding: Theme.spacing.lg, marginBottom: Theme.spacing.md }]}>
              <View style={[styles.taskCardHeader, { marginBottom: Theme.spacing.md }]}>
                <Shimmer width="55%" height={moderateScale(16)} borderRadius={4} />
                <View style={{ flexDirection: 'row', gap: moderateScale(6), alignItems: 'center' }}>
                  <Shimmer width={moderateScale(45)} height={moderateScale(18)} borderRadius={moderateScale(10)} />
                  <Shimmer width={moderateScale(45)} height={moderateScale(18)} borderRadius={moderateScale(10)} />
                </View>
              </View>
              <View style={styles.taskDetails}>
                <View style={styles.taskDetailRow}>
                  <Shimmer width={moderateScale(16)} height={moderateScale(16)} borderRadius={moderateScale(8)} />
                  <Shimmer width="30%" height={12} borderRadius={2} />
                  <Shimmer width="20%" height={12} borderRadius={2} />
                </View>
                <View style={styles.taskDetailRow}>
                  <Shimmer width={moderateScale(16)} height={moderateScale(16)} borderRadius={moderateScale(8)} />
                  <Shimmer width="30%" height={12} borderRadius={2} />
                  <Shimmer width="20%" height={12} borderRadius={2} />
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={moderateScale(48)} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchTasks()}>
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
              onRefresh={() => fetchTasks(true)}
              colors={[Colors.primary]}
              tintColor={Colors.primary}
            />
          }
        >
          <View style={styles.analyticsSection}>
            <View style={styles.analyticsHeader}>
              <View style={styles.analyticsTitleContainer}>
                <Text style={styles.analyticsTitle}>Task Analytics</Text>
                <Text style={styles.analyticsSubtitle}>June 2026</Text>
              </View>
            </View>

            <View style={styles.analyticsCardsRow}>
              <View style={[styles.analyticsCard, styles.completionCard]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="checkmark-circle" size={moderateScale(16)} color={Colors.success} />
                  </View>
                  <Text style={styles.cardLabel}>COMPLETION RATE</Text>
                </View>
                <Text style={styles.cardPercentage}>{completionRate}%</Text>
                <View style={styles.cardProgress}>
                  <View style={[styles.cardProgressBar, { width: `${parseFloat(completionRate)}%` }]} />
                </View>
                <Text style={styles.cardSublabel}>Tasks completed</Text>
              </View>

              <View style={[styles.analyticsCard, styles.pendingCard]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardIconContainer}>
                    <Ionicons name="time" size={moderateScale(16)} color={Colors.accent} />
                  </View>
                  <Text style={styles.cardLabel}>PENDING TASKS</Text>
                </View>
                <Text style={styles.cardPercentage}>{String(summary.pending).padStart(2, '0')}</Text>
                <View style={styles.cardProgress}>
                  <View style={[styles.cardProgressBar, styles.cardProgressBarPending, { width: `${Math.min(summary.pending * 10, 100)}%` }]} />
                </View>
                {summary.pending > 0 && (
                  <TouchableOpacity style={styles.needsAttentionButton} activeOpacity={0.7}>
                    <Text style={styles.needsAttentionText}>Needs attention</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>

          <View style={styles.taskSection}>
            <View style={styles.taskSectionHeaderRow}>
              <Text style={styles.taskSectionTitle}>All Tasks</Text>
              <TouchableOpacity
                style={[
                  styles.filterIconButton,
                  (filterStatus !== undefined || filterPriority !== undefined || filterTimeframe !== undefined) && { backgroundColor: 'rgba(255, 77, 28, 0.1)' }
                ]}
                onPress={() => setIsFilterModalVisible(true)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="funnel-outline"
                  size={moderateScale(18)}
                  color={(filterStatus !== undefined || filterPriority !== undefined || filterTimeframe !== undefined) ? Colors.primary : Colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {tasks.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="document-text-outline" size={moderateScale(40)} color={Colors.borderStrong} />
                <Text style={styles.emptyText}>No tasks found matching your filters.</Text>
              </View>
            ) : (
              <View style={{ gap: Theme.spacing.md }}>
                {/* High Priority Group */}
                <View style={styles.priorityGroup}>
                  <View style={[styles.groupHeader, { borderLeftColor: '#EF4444' }]}>
                    <Text style={[styles.groupHeaderText, { color: '#EF4444' }]}>High Priority ({tasks.filter(t => t.priority === 'High').length})</Text>
                  </View>
                  {tasks.filter(t => t.priority === 'High').length === 0 ? (
                    <View style={styles.emptyGroupCard}>
                      <Text style={styles.emptyGroupText}>No high priority tasks available</Text>
                    </View>
                  ) : (
                    tasks.filter(t => t.priority === 'High').map(task => (
                      <TaskCard
                        key={task.pk_task_id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onPress={() => handleEditTask(task)}
                      />
                    ))
                  )}
                </View>

                {/* Medium Priority Group */}
                <View style={styles.priorityGroup}>
                  <View style={[styles.groupHeader, { borderLeftColor: '#3B82F6' }]}>
                    <Text style={[styles.groupHeaderText, { color: '#3B82F6' }]}>Medium Priority ({tasks.filter(t => (t.priority || 'Medium') === 'Medium').length})</Text>
                  </View>
                  {tasks.filter(t => (t.priority || 'Medium') === 'Medium').length === 0 ? (
                    <View style={styles.emptyGroupCard}>
                      <Text style={styles.emptyGroupText}>No medium priority tasks available</Text>
                    </View>
                  ) : (
                    tasks.filter(t => (t.priority || 'Medium') === 'Medium').map(task => (
                      <TaskCard
                        key={task.pk_task_id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onPress={() => handleEditTask(task)}
                      />
                    ))
                  )}
                </View>

                {/* Low Priority Group */}
                <View style={styles.priorityGroup}>
                  <View style={[styles.groupHeader, { borderLeftColor: '#6B7280' }]}>
                    <Text style={[styles.groupHeaderText, { color: '#6B7280' }]}>Low Priority ({tasks.filter(t => t.priority === 'Low').length})</Text>
                  </View>
                  {tasks.filter(t => t.priority === 'Low').length === 0 ? (
                    <View style={styles.emptyGroupCard}>
                      <Text style={styles.emptyGroupText}>No low priority tasks available</Text>
                    </View>
                  ) : (
                    tasks.filter(t => t.priority === 'Low').map(task => (
                      <TaskCard
                        key={task.pk_task_id}
                        task={task}
                        onStatusChange={handleStatusChange}
                        onPress={() => handleEditTask(task)}
                      />
                    ))
                  )}
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      )}

      {/* Filter Modal */}
      <Modal
        visible={isFilterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsFilterModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.grabHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Tasks</Text>
              <TouchableOpacity onPress={() => setIsFilterModalVisible(false)} style={styles.modalCloseButton}>
                <Ionicons name="close" size={moderateScale(20)} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
              {/* Status Filter */}
              <Text style={styles.filterSectionTitle}>Status</Text>
              <View style={styles.filterOptionsRow}>
                {([undefined, 'Pending', 'Canceled', 'Finished'] as (TaskStatus | undefined)[]).map((st) => {
                  const isActive = filterStatus === st;
                  const color = st === undefined ? Colors.primary : statusConfig[st].color;
                  const bg = st === undefined ? 'rgba(255, 77, 28, 0.05)' : statusConfig[st].bg;
                  const activeBg = st === undefined ? 'rgba(255, 77, 28, 0.12)' : statusConfig[st].activeBg;
                  return (
                    <TouchableOpacity
                      key={String(st)}
                      style={[
                        styles.filterBadge,
                        { borderColor: 'transparent', backgroundColor: 'rgba(0, 0, 0, 0.03)' },
                        isActive && {
                          backgroundColor: activeBg || bg,
                          borderColor: color,
                          borderWidth: 1.5,
                        }
                      ]}
                      onPress={() => setFilterStatus(st)}
                    >
                      <Text style={[styles.filterBadgeText, isActive && { color, fontFamily: 'Outfit_700Bold' }]}>
                        {st === undefined ? 'All' : st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Priority Filter */}
              <Text style={styles.filterSectionTitle}>Priority</Text>
              <View style={styles.filterOptionsRow}>
                {([undefined, 'High', 'Medium', 'Low'] as ('High' | 'Medium' | 'Low' | undefined)[]).map((pr) => {
                  const isActive = filterPriority === pr;
                  const color = pr === undefined ? Colors.primary : priorityConfig[pr].color;
                  const bg = pr === undefined ? 'rgba(255, 77, 28, 0.05)' : priorityConfig[pr].bg;
                  const activeBg = pr === undefined ? 'rgba(255, 77, 28, 0.12)' : priorityConfig[pr].activeBg;
                  return (
                    <TouchableOpacity
                      key={String(pr)}
                      style={[
                        styles.filterBadge,
                        { borderColor: 'transparent', backgroundColor: 'rgba(0, 0, 0, 0.03)' },
                        isActive && {
                          backgroundColor: activeBg || bg,
                          borderColor: color,
                          borderWidth: 1.5,
                        }
                      ]}
                      onPress={() => setFilterPriority(pr)}
                    >
                      <Text style={[styles.filterBadgeText, isActive && { color, fontFamily: 'Outfit_700Bold' }]}>
                        {pr === undefined ? 'All' : pr}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Timeframe Filter */}
              <Text style={styles.filterSectionTitle}>Timeframe</Text>
              <View style={styles.filterOptionsRow}>
                {([
                  { val: undefined, label: 'All' },
                  { val: '7days', label: 'Last 7 Days' },
                  { val: '1month', label: 'Last Month' },
                  { val: 'custom', label: 'Custom Date' }
                ] as const).map((tf) => {
                  const isActive = filterTimeframe === tf.val;
                  return (
                    <TouchableOpacity
                      key={String(tf.val)}
                      style={[
                        styles.filterBadge,
                        { borderColor: 'transparent', backgroundColor: 'rgba(0, 0, 0, 0.03)' },
                        isActive && {
                          backgroundColor: 'rgba(255, 77, 28, 0.08)',
                          borderColor: Colors.primary,
                          borderWidth: 1.5,
                        }
                      ]}
                      onPress={() => {
                        setFilterTimeframe(tf.val);
                        if (tf.val !== 'custom') {
                          setFilterStartDate(undefined);
                          setFilterEndDate(undefined);
                        }
                      }}
                    >
                      <Text style={[styles.filterBadgeText, isActive && { color: Colors.primary, fontFamily: 'Outfit_700Bold' }]}>
                        {tf.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Custom Date Pickers */}
              {filterTimeframe === 'custom' && (
                <View style={styles.customDateContainer}>
                  <View style={styles.datePickerGroup}>
                    <Text style={styles.datePickerLabel}>Start Date</Text>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={moderateScale(14)} color={Colors.textSecondary} style={{ marginRight: moderateScale(4) }} />
                      <Text style={styles.datePickerText}>
                        {filterStartDate || 'Select Start'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.datePickerGroup}>
                    <Text style={styles.datePickerLabel}>End Date</Text>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <Ionicons name="calendar-outline" size={moderateScale(14)} color={Colors.textSecondary} style={{ marginRight: moderateScale(4) }} />
                      <Text style={styles.datePickerText}>
                        {filterEndDate || 'Select End'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {showStartDatePicker && (
                <DateTimePicker
                  value={startDatePickerVal}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowStartDatePicker(false);
                    if (date) {
                      setStartDatePickerVal(date);
                      setFilterStartDate(date.toISOString().split('T')[0]);
                    }
                  }}
                />
              )}

              {showEndDatePicker && (
                <DateTimePicker
                  value={endDatePickerVal}
                  mode="date"
                  display="default"
                  onChange={(event, date) => {
                    setShowEndDatePicker(false);
                    if (date) {
                      setEndDatePickerVal(date);
                      setFilterEndDate(date.toISOString().split('T')[0]);
                    }
                  }}
                />
              )}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setFilterStatus(undefined);
                  setFilterPriority(undefined);
                  setFilterTimeframe(undefined);
                  setFilterStartDate(undefined);
                  setFilterEndDate(undefined);
                  setIsFilterModalVisible(false);
                  setTimeout(() => {
                    fetchTasks();
                  }, 50);
                }}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  setIsFilterModalVisible(false);
                  fetchTasks();
                }}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
    filter: 'blur(50px)',
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.md,
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
  completionCard: {
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  pendingCard: {
    borderWidth: 1,
    borderColor: 'rgba(255, 179, 0, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.xs,
  },
  cardIconContainer: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(6),
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(9),
    color: Colors.textSecondary,
    letterSpacing: 0.3,
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
  cardProgressBarPending: {
    backgroundColor: Colors.accent,
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
  taskSection: {
    marginTop: Theme.spacing.lg,
  },
  taskSectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  taskSectionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.text,
    marginBottom: 0,
  },
  filterIconButton: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  taskCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Theme.spacing.md,
  },
  taskTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(14),
    color: Colors.text,
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  statusBadge: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(12),
  },
  statusBadgePending: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statusBadgeCanceled: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  statusBadgeFinished: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  statusText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(10),
    color: Colors.textSecondary,
  },
  taskDetails: {
    gap: moderateScale(12),
  },
  taskDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(12),
  },
  taskDetailLabel: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  taskDetailValue: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(12),
    color: Colors.text,
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
  priorityGroup: {
    marginBottom: Theme.spacing.md,
  },
  groupHeader: {
    paddingLeft: Theme.spacing.sm,
    borderLeftWidth: 4,
    marginBottom: Theme.spacing.sm,
  },
  groupHeaderText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
  },
  emptyGroupCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.015)',
    borderRadius: moderateScale(12),
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    borderStyle: 'dashed',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.md,
  },
  emptyGroupText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(12),
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingHorizontal: Theme.spacing.xl,
    paddingTop: Theme.spacing.md,
    paddingBottom: moderateScale(40),
    maxHeight: '85%',
  },
  grabHandle: {
    width: moderateScale(40),
    height: moderateScale(4),
    backgroundColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: moderateScale(2),
    alignSelf: 'center',
    marginBottom: Theme.spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.lg,
  },
  modalCloseButton: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  modalForm: {
    marginBottom: Theme.spacing.lg,
  },
  filterSectionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.text,
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.sm,
  },
  filterOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  filterBadge: {
    flex: 1,
    minWidth: '22%',
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    borderWidth: 1.5,
    borderColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
    borderColor: Colors.primary,
  },
  filterBadgeText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  filterBadgeTextActive: {
    color: Colors.primary,
  },
  customDateContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  datePickerGroup: {
    flex: 1,
  },
  datePickerLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    marginBottom: moderateScale(4),
  },
  datePickerButton: {
    height: moderateScale(36),
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  datePickerText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(11),
    color: Colors.text,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  resetButton: {
    flex: 1,
    height: moderateScale(46),
    borderRadius: moderateScale(12),
    borderWidth: 1.5,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
  },
  applyButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    height: moderateScale(46),
    borderRadius: moderateScale(12),
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.white,
  },
});

export default DailyTaskScreen;

import React, { useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppBar from '../../../components/AppBar';
import { Colors, Theme } from '../../../theme/colors';
import { moderateScale } from '../../../utils/responsive';
import { updateDailyTask, deleteDailyTask, UpdateTaskDto, TaskStatus } from '../services/daily-task.service';

const statusConfig: Record<TaskStatus, { color: string; bg: string; icon: string; activeBg: string }> = {
  Pending: { color: '#D97706', bg: 'rgba(245, 158, 11, 0.05)', activeBg: 'rgba(245, 158, 11, 0.15)', icon: 'time' },
  Canceled: { color: '#DC2626', bg: 'rgba(239, 68, 68, 0.05)', activeBg: 'rgba(239, 68, 68, 0.15)', icon: 'close-circle' },
  Finished: { color: '#059669', bg: 'rgba(16, 185, 129, 0.05)', activeBg: 'rgba(16, 185, 129, 0.15)', icon: 'checkmark-circle' },
};

const normalizeStatus = (s: string): TaskStatus => {
  if (!s) return 'Pending';
  const lower = s.toLowerCase();
  if (lower === 'finished') return 'Finished';
  if (lower === 'canceled' || lower === 'cancelled') return 'Canceled';
  return 'Pending';
};

const EditDailyTaskScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { task } = route.params;
  const [taskName, setTaskName] = useState(task.task_name);
  const [reachingDate, setReachingDate] = useState(task.reaching_date);
  const [reachingTime, setReachingTime] = useState(task.reaching_time);
  const [status, setStatus] = useState<TaskStatus>(() => normalizeStatus(task.status));
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isDescFocused, setIsDescFocused] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(task.reaching_date));
  const [selectedTime, setSelectedTime] = useState(() => {
    const [hours, minutes] = task.reaching_time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return date;
  });

  const handleSave = async () => {
    if (!taskName.trim()) {
      Alert.alert('Error', 'Please enter a task name');
      return;
    }
    if (!reachingDate) {
      Alert.alert('Error', 'Please select a reaching date');
      return;
    }
    if (!reachingTime) {
      Alert.alert('Error', 'Please select a reaching time');
      return;
    }

    setIsLoading(true);
    try {
      const payload: UpdateTaskDto = {
        task_name: taskName.trim(),
        reaching_date: reachingDate,
        reaching_time: reachingTime,
        status,
      };

      const result = await updateDailyTask(task.pk_task_id, payload);
      if (!result) {
        Alert.alert('Error', 'Task not found or database table not available');
        return;
      }
      Alert.alert('Success', 'Task updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update task');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (date) {
      setSelectedDate(date);
      const formattedDate = date.toISOString().split('T')[0];
      setReachingDate(formattedDate);
    }
  };

  const handleTimeChange = (event: any, time?: Date) => {
    if (Platform.OS === 'android') {
      setShowTimePicker(false);
    }
    if (time) {
      setSelectedTime(time);
      const hours = time.getHours().toString().padStart(2, '0');
      const minutes = time.getMinutes().toString().padStart(2, '0');
      setReachingTime(`${hours}:${minutes}`);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDailyTask(task.pk_task_id);
              Alert.alert('Success', 'Task deleted successfully', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            } catch (err) {
              Alert.alert('Error', err instanceof Error ? err.message : 'Failed to delete task');
            }
          },
        },
      ]
    );
  };

  const formatDateLabel = (dateStr: string) => {
    try {
      const dateObj = new Date(dateStr);
      return dateObj.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <AppBar
        title="Update Task Status"
        showBackButton
        onBackPress={handleCancel}
      />

      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.12)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: moderateScale(60) + insets.bottom }]}
      >
        <View style={styles.formSection}>
          <View style={styles.formCard}>
            
            {/* Task Description Input - READ ONLY */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="create-outline" size={moderateScale(16)} color={Colors.textSecondary} />
                <Text style={styles.label}>Task Description</Text>
              </View>
              <TextInput
                style={[
                  styles.input,
                  styles.inputDisabled,
                ]}
                placeholder="No description provided"
                value={taskName}
                multiline
                numberOfLines={3}
                placeholderTextColor={Colors.textMuted}
                editable={false}
              />
            </View>

            {/* Due Date Selector - READ ONLY */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="calendar-outline" size={moderateScale(16)} color={Colors.textSecondary} />
                <Text style={styles.label}>Due Date</Text>
              </View>
              <View style={[styles.dateSelectorButton, styles.selectorDisabled]}>
                <Text style={styles.dateSelectorTextDisabled}>
                  {reachingDate ? formatDateLabel(reachingDate) : 'No Date Set'}
                </Text>
              </View>
            </View>

            {/* Due Time Selector - READ ONLY */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="time-outline" size={moderateScale(16)} color={Colors.textSecondary} />
                <Text style={styles.label}>Due Time</Text>
              </View>
              <View style={[styles.dateSelectorButton, styles.selectorDisabled]}>
                <Text style={styles.dateSelectorTextDisabled}>{reachingTime || 'No Time Set'}</Text>
              </View>
            </View>

            {/* Status Selection Row */}
            <View style={styles.formGroup}>
              <View style={styles.labelRow}>
                <Ionicons name="flag-outline" size={moderateScale(16)} color={Colors.primary} />
                <Text style={styles.label}>Task Status</Text>
              </View>
              <View style={styles.statusOptions}>
                {(['Pending', 'Canceled', 'Finished'] as TaskStatus[]).map((statusOption) => {
                  const isActive = status === statusOption;
                  const config = statusConfig[statusOption];
                  return (
                    <TouchableOpacity
                      key={statusOption}
                      activeOpacity={0.8}
                      style={[
                        styles.statusOption,
                        { backgroundColor: config.bg, borderColor: 'rgba(0,0,0,0.04)' },
                        isActive && {
                          backgroundColor: config.activeBg,
                          borderColor: config.color,
                          borderWidth: 1.5,
                        },
                      ]}
                      onPress={() => setStatus(statusOption)}
                    >
                      <Ionicons
                        name={isActive ? (config.icon as any) : `${config.icon}-outline`}
                        size={moderateScale(16)}
                        color={config.color}
                        style={{ marginBottom: moderateScale(4) }}
                      />
                      <Text
                        style={[
                          styles.statusOptionText,
                          { color: Colors.textSecondary },
                          isActive && { color: config.color, fontFamily: 'Outfit_700Bold' },
                        ]}
                      >
                        {statusOption}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

          </View>
        </View>

        {/* Action Button Row */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            disabled={isLoading}
            onPress={handleSave}
            activeOpacity={0.9}
            style={styles.saveButtonContainer}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.saveButtonGradient}
            >
              <View style={styles.saveButtonContent}>
                <Ionicons name="checkmark-circle-outline" size={moderateScale(18)} color="#FFFFFF" />
                <Text style={styles.saveButtonText}>
                  {isLoading ? 'Updating Status...' : 'Confirm Status Update'}
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isLoading}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  headerDeleteButton: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
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
    backgroundColor: 'rgba(255, 179, 0, 0.1)',
    filter: 'blur(45px)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(40),
    right: -moderateScale(60),
    width: moderateScale(250),
    height: moderateScale(250),
    borderRadius: moderateScale(125),
    backgroundColor: 'rgba(255, 77, 28, 0.07)',
    filter: 'blur(55px)',
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.lg,
  },
  formSection: {
    marginTop: Theme.spacing.xs,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    padding: Theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.03)',
    ...Theme.shadow.sm,
  },
  formGroup: {
    marginBottom: Theme.spacing.xl,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.xs,
    marginBottom: Theme.spacing.sm,
  },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(13),
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: moderateScale(12),
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    fontSize: moderateScale(14),
    color: Colors.text,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    textAlignVertical: 'top',
    fontFamily: 'Outfit_400Regular',
    minHeight: moderateScale(90),
  },
  inputFocused: {
    borderColor: Colors.primary,
    backgroundColor: '#FFFFFF',
    ...Theme.shadow.sm,
  },
  dateSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8F9FA',
    borderRadius: moderateScale(12),
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.04)',
  },
  inputDisabled: {
    backgroundColor: '#F1F3F5',
    color: '#868E96',
    borderColor: 'rgba(0, 0, 0, 0.02)',
  },
  selectorDisabled: {
    backgroundColor: '#F1F3F5',
    borderColor: 'rgba(0, 0, 0, 0.02)',
    opacity: 0.85,
  },
  dateSelectorTextDisabled: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(14),
    color: '#868E96',
  },
  dateSelectorText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  statusOption: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: moderateScale(12),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusOptionText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
  },
  actionSection: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.md,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: Theme.spacing.sm,
    borderRadius: moderateScale(14),
    backgroundColor: 'transparent',
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
  },
  saveButtonContainer: {
    width: '100%',
    borderRadius: moderateScale(14),
    overflow: 'hidden',
    ...Theme.shadow.md,
  },
  saveButtonGradient: {
    paddingVertical: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  saveButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(15),
    color: Colors.white,
    letterSpacing: 0.3,
  },
});

export default EditDailyTaskScreen;

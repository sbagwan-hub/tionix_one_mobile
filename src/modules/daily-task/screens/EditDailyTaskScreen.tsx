import React, { useState, useEffect } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AppCard from '../../../components/AppCard';
import AppBar from '../../../components/AppBar';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { updateDailyTask, deleteDailyTask, UpdateTaskDto, TaskStatus, DailyTask } from '../services/dailyTask';

const EditDailyTaskScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const { task } = route.params;
  const [taskName, setTaskName] = useState(task.task_name);
  const [reachingDate, setReachingDate] = useState(task.reaching_date);
  const [reachingTime, setReachingTime] = useState(task.reaching_time);
  const [status, setStatus] = useState<TaskStatus>(task.status);
  const [isLoading, setIsLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(task.reaching_date));
  const [selectedTime, setSelectedTime] = useState(() => {
    const [hours, minutes] = task.reaching_time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <AppBar title="Edit Task" showBackButton onBackPress={handleCancel} />

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
        contentContainerStyle={[styles.content, { paddingBottom: moderateScale(120) + insets.bottom }]}
      >
        <View style={styles.formSection}>
          <View style={styles.formCard}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Task Description</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter task description"
                value={taskName}
                onChangeText={setTaskName}
                multiline
                numberOfLines={4}
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Due Date</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={moderateScale(20)} color={Colors.primary} />
                <Text style={styles.dateButtonText}>{reachingDate || 'Select date'}</Text>
                <Ionicons name="chevron-down" size={moderateScale(16)} color={Colors.textMuted} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={selectedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'default' : 'default'}
                  onChange={handleDateChange}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Due Time</Text>
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowTimePicker(true)}
              >
                <Ionicons name="time-outline" size={moderateScale(20)} color={Colors.primary} />
                <Text style={styles.dateButtonText}>{reachingTime || 'Select time'}</Text>
                <Ionicons name="chevron-down" size={moderateScale(16)} color={Colors.textMuted} />
              </TouchableOpacity>
              {showTimePicker && (
                <DateTimePicker
                  value={selectedTime}
                  mode="time"
                  display={Platform.OS === 'ios' ? 'default' : 'default'}
                  onChange={handleTimeChange}
                />
              )}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Status</Text>
              <View style={styles.statusOptions}>
                {(['Pending', 'Canceled', 'Finished'] as TaskStatus[]).map((statusOption) => (
                  <TouchableOpacity
                    key={statusOption}
                    style={[
                      styles.statusOption,
                      status === statusOption && styles.statusOptionActive,
                    ]}
                    onPress={() => setStatus(statusOption)}
                  >
                    <Text
                      style={[
                        styles.statusOptionText,
                        status === statusOption && styles.statusOptionTextActive,
                      ]}
                    >
                      {statusOption}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton]}
            onPress={handleCancel}
            disabled={isLoading}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.deleteButton]}
            onPress={handleDelete}
            disabled={isLoading}
          >
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.saveButton, isLoading && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isLoading}
          >
            {isLoading ? (
              <Text style={styles.saveButtonText}>Saving...</Text>
            ) : (
              <Text style={styles.saveButtonText}>Update Task</Text>
            )}
          </TouchableOpacity>
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
  formSection: {
    marginTop: Theme.spacing.md,
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: Theme.spacing.lg,
    ...Theme.shadow.sm,
  },
  formGroup: {
    marginBottom: Theme.spacing.lg,
  },
  label: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(14),
    color: Colors.text,
    marginBottom: Theme.spacing.sm,
  },
  input: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: moderateScale(12),
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    fontSize: moderateScale(14),
    color: Colors.text,
    borderWidth: 0,
    textAlignVertical: 'top',
    fontFamily: 'Outfit_400Regular',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: moderateScale(12),
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    borderWidth: 0,
  },
  dateButtonText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  statusOptions: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  statusOption: {
    flex: 1,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderWidth: 0,
    alignItems: 'center',
  },
  statusOptionActive: {
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
  },
  statusOptionText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  statusOptionTextActive: {
    color: Colors.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: Theme.spacing.md,
    borderRadius: moderateScale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderWidth: 0,
  },
  cancelButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(16),
    color: Colors.text,
  },
  deleteButton: {
    backgroundColor: '#EF4444',
  },
  deleteButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(16),
    color: Colors.white,
  },
  saveButton: {
    backgroundColor: Colors.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(16),
    color: Colors.white,
  },
});

export default EditDailyTaskScreen;

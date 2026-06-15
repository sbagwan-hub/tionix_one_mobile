import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { applyForPersonalWork } from '../services/personalWork.service';

const PRIMARY_GRADIENT = Colors.primaryGradient;

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDisplayDate = (value: string) => {
  if (!value) return 'Select date';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

const FormCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={styles.formCard}>
    <Text style={styles.cardHeading}>{title}</Text>
    <View style={styles.cardContent}>{children}</View>
  </View>
);

const ApplyPersonalWorkScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();

  // ERP Metadata State
  const [requestDate] = useState(new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }));
  const [selectedDate, setSelectedDate] = useState(toDateInput(new Date()));

  // Form Fields State
  const [leavingHour, setLeavingHour] = useState('10');
  const [leavingMinute, setLeavingMinute] = useState('00');
  const [leavingAmPm, setLeavingAmPm] = useState('AM');

  const [returnHour, setReturnHour] = useState('11');
  const [returnMinute, setReturnMinute] = useState('00');
  const [returnAmPm, setReturnAmPm] = useState('AM');

  const [breakTime, setBreakTime] = useState('60');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Time selector modal states
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState<'leaving' | 'return'>('leaving');
  const [tempHour, setTempHour] = useState('10');
  const [tempMinute, setTempMinute] = useState('00');
  const [tempAmPm, setTempAmPm] = useState('AM');

  // Calendar states & logic
  const CALENDAR_MONTHS = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date().getMonth());
  const [currentCalendarYear, setCurrentCalendarYear] = useState(new Date().getFullYear());

  const getDaysInMonth = useCallback((year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  }, []);

  const getFirstDayOfMonth = useCallback((year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  }, []);

  const handleOpenCalendar = useCallback(() => {
    const parsed = new Date(`${selectedDate}T00:00:00`);
    const initialDate = isNaN(parsed.getTime()) ? new Date() : parsed;
    setCurrentCalendarMonth(initialDate.getMonth());
    setCurrentCalendarYear(initialDate.getFullYear());
    setIsCalendarOpen(true);
  }, [selectedDate]);

  const handlePrevMonth = useCallback(() => {
    setCurrentCalendarMonth(prev => {
      if (prev === 0) {
        setCurrentCalendarYear(y => y - 1);
        return 11;
      }
      return prev - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setCurrentCalendarMonth(prev => {
      if (prev === 11) {
        setCurrentCalendarYear(y => y + 1);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const handleSelectDate = useCallback((dateString: string) => {
    setSelectedDate(dateString);
    setIsCalendarOpen(false);
  }, []);

  const calendarDaysGrid = useMemo(() => {
    const daysInMonth = getDaysInMonth(currentCalendarYear, currentCalendarMonth);
    const firstDayIndex = getFirstDayOfMonth(currentCalendarYear, currentCalendarMonth);
    const grid = [];

    // Prev month padding
    const prevMonth = currentCalendarMonth === 0 ? 11 : currentCalendarMonth - 1;
    const prevYear = currentCalendarMonth === 0 ? currentCalendarYear - 1 : currentCalendarYear;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      grid.push({
        day,
        month: prevMonth,
        year: prevYear,
        dateString: `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isToday: false,
      });
    }

    // Current month days
    const today = new Date();
    const todayStr = toDateInput(today);
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${currentCalendarYear}-${String(currentCalendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const isToday = dateString === todayStr;
      grid.push({
        day,
        month: currentCalendarMonth,
        year: currentCalendarYear,
        dateString,
        isToday,
      });
    }

    // Next month padding to fill grid
    const totalCells = 42; // 6 rows * 7 days
    const nextMonth = currentCalendarMonth === 11 ? 0 : currentCalendarMonth + 1;
    const nextYear = currentCalendarMonth === 11 ? currentCalendarYear + 1 : currentCalendarYear;
    const remainingCells = totalCells - grid.length;
    for (let day = 1; day <= remainingCells; day++) {
      grid.push({
        day,
        month: nextMonth,
        year: nextYear,
        dateString: `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        isToday: false,
      });
    }

    return grid;
  }, [currentCalendarMonth, currentCalendarYear, getDaysInMonth, getFirstDayOfMonth]);

  // Open Time Picker Modal
  const openTimePicker = (target: 'leaving' | 'return') => {
    setTimePickerTarget(target);
    if (target === 'leaving') {
      setTempHour(leavingHour);
      setTempMinute(leavingMinute);
      setTempAmPm(leavingAmPm);
    } else {
      setTempHour(returnHour);
      setTempMinute(returnMinute);
      setTempAmPm(returnAmPm);
    }
    setIsTimePickerOpen(true);
  };

  const confirmTime = () => {
    if (timePickerTarget === 'leaving') {
      setLeavingHour(tempHour);
      setLeavingMinute(tempMinute);
      setLeavingAmPm(tempAmPm);
    } else {
      setReturnHour(tempHour);
      setReturnMinute(tempMinute);
      setReturnAmPm(tempAmPm);
    }
    setIsTimePickerOpen(false);
  };

  // Helper to convert selected options to standard Date object
  const getTimesAsDates = useCallback(() => {
    const parseHour = (hStr: string, ampm: string) => {
      let h = parseInt(hStr, 10);
      if (ampm === 'PM' && h < 12) h += 12;
      if (ampm === 'AM' && h === 12) h = 0;
      return h;
    };

    const lHour = parseHour(leavingHour, leavingAmPm);
    const rHour = parseHour(returnHour, returnAmPm);

    const lDate = new Date(`${selectedDate}T${String(lHour).padStart(2, '0')}:${leavingMinute}:00`);
    const rDate = new Date(`${selectedDate}T${String(rHour).padStart(2, '0')}:${returnMinute}:00`);

    return { lDate, rDate };
  }, [selectedDate, leavingHour, leavingMinute, leavingAmPm, returnHour, returnMinute, returnAmPm]);

  // Recalculate duration whenever times or date change
  useEffect(() => {
    const { lDate, rDate } = getTimesAsDates();
    if (!isNaN(lDate.getTime()) && !isNaN(rDate.getTime())) {
      const diffMs = rDate.getTime() - lDate.getTime();
      if (diffMs > 0) {
        const diffMins = Math.floor(diffMs / 60000);
        setBreakTime(String(diffMins));
      } else {
        setBreakTime('0');
      }
    }
  }, [getTimesAsDates]);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Please enter a reason for personal work.',
      });
      return;
    }

    const { lDate, rDate } = getTimesAsDates();

    if (isNaN(lDate.getTime()) || isNaN(rDate.getTime())) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Selected dates and times are invalid.',
      });
      return;
    }

    if (lDate >= rDate) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Leaving time must be before return time.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await applyForPersonalWork({
        leaving_time: lDate.toISOString(),
        return_time: rDate.toISOString(),
        break_time: Number(breakTime),
        reason: reason.trim(),
        remarks: remarks.trim(),
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Personal work request submitted successfully.',
      });
      navigation.goBack();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Submission Failed',
        text2: err.message || 'Server error occurred.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hoursList = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
  const minutesList = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Header Banner */}
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
          <Text style={styles.headerTitle}>Apply Personal Work</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.dateLabel}>{requestDate}</Text>
          <Text style={styles.headerSubtitle}>Request a short break for personal work.</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + moderateScale(100) }]}
        >
          {/* 1. Date Selection Card */}
          <FormCard title="Select Date">
            <TouchableOpacity
              style={styles.selectButton}
              activeOpacity={0.8}
              onPress={handleOpenCalendar}
            >
              <Ionicons name="calendar-outline" size={moderateScale(20)} color={Colors.primary} />
              <Text style={styles.selectButtonText}>{formatDisplayDate(selectedDate)}</Text>
              <Ionicons name="chevron-forward-outline" size={moderateScale(18)} color={Colors.textMuted} style={styles.chevronIcon} />
            </TouchableOpacity>
          </FormCard>

          {/* 2. Timing Selection Card */}
          <FormCard title="Timing & Duration">
            <View style={styles.timingRow}>
              <TouchableOpacity
                style={styles.timeSelectBtn}
                activeOpacity={0.8}
                onPress={() => openTimePicker('leaving')}
              >
                <Text style={styles.timeLabel}>Leaving Time</Text>
                <Text style={styles.timeValue}>{leavingHour}:{leavingMinute} {leavingAmPm}</Text>
              </TouchableOpacity>

              <View style={styles.timingSpacer}>
                <Ionicons name="arrow-forward" size={16} color={Colors.textMuted} />
              </View>

              <TouchableOpacity
                style={styles.timeSelectBtn}
                activeOpacity={0.8}
                onPress={() => openTimePicker('return')}
              >
                <Text style={styles.timeLabel}>Return Time</Text>
                <Text style={styles.timeValue}>{returnHour}:{returnMinute} {returnAmPm}</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Break Duration (minutes)</Text>
            <TextInput
              style={styles.textInput}
              keyboardType="number-pad"
              value={breakTime}
              onChangeText={setBreakTime}
              placeholder="Duration in mins"
            />
          </FormCard>

          {/* 3. Reason Selection Card */}
          <FormCard title="Justification">
            <Text style={styles.inputLabel}>Reason *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              multiline
              numberOfLines={4}
              value={reason}
              onChangeText={setReason}
              placeholder="Explain the reason for leaving..."
              textAlignVertical="top"
            />

            <Text style={styles.inputLabel}>Remarks (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Any additional notes"
            />
          </FormCard>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitBtn}
            onPress={handleSubmit}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={PRIMARY_GRADIENT}
              style={styles.gradientBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.submitBtnText}>
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Calendar Modal */}
      <Modal
        visible={isCalendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCalendarOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsCalendarOpen(false)}>
          <Pressable style={[styles.modalSheet, { maxHeight: '80%' }]} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Request Date</Text>
              <TouchableOpacity onPress={() => setIsCalendarOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.calendarContainer}>
              {/* Month Selector Row */}
              <View style={styles.calendarHeaderRow}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-back" size={20} color={Colors.text} />
                </TouchableOpacity>
                <Text style={styles.calendarMonthYearText}>
                  {CALENDAR_MONTHS[currentCalendarMonth]} {currentCalendarYear}
                </Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-forward" size={20} color={Colors.text} />
                </TouchableOpacity>
              </View>

              {/* Weekday Headers */}
              <View style={styles.weekdaysRow}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(dayName => (
                  <Text key={dayName} style={styles.weekdayText}>{dayName}</Text>
                ))}
              </View>

              {/* Days Grid */}
              <View style={styles.daysGrid}>
                {calendarDaysGrid.map((dayObj, gridIdx) => {
                  const isSelected = dayObj.dateString === selectedDate;
                  const isCurrentMonth = dayObj.month === currentCalendarMonth;
                  const isToday = dayObj.isToday;

                  return (
                    <TouchableOpacity
                      key={gridIdx}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        !isCurrentMonth && styles.dayCellInactive,
                      ]}
                      onPress={() => dayObj.dateString && handleSelectDate(dayObj.dateString)}
                      disabled={!dayObj.dateString}
                    >
                      {isSelected ? (
                        <LinearGradient
                          colors={Colors.primaryGradient}
                          style={styles.daySelectedGradient}
                        >
                          <Text style={styles.dayCellTextSelected}>{dayObj.day}</Text>
                        </LinearGradient>
                      ) : (
                        <Text style={[
                          styles.dayCellText,
                          isToday && styles.dayCellTextToday,
                          !isCurrentMonth && styles.dayCellTextInactive
                        ]}>
                          {dayObj.day}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Time Picker Modal */}
      <Modal
        visible={isTimePickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsTimePickerOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsTimePickerOpen(false)}>
          <Pressable style={styles.timeModalSheet} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {timePickerTarget === 'leaving' ? 'Leaving' : 'Return'} Time
              </Text>
              <TouchableOpacity onPress={() => setIsTimePickerOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerContainer}>
              {/* Hour Selection */}
              <View style={styles.timeColumn}>
                <Text style={styles.timeColTitle}>Hour</Text>
                <ScrollView contentContainerStyle={styles.timeScrollContent}>
                  {hoursList.map(h => (
                    <TouchableOpacity
                      key={h}
                      style={[styles.timeItem, tempHour === h && styles.timeItemSelected]}
                      onPress={() => setTempHour(h)}
                    >
                      <Text style={[styles.timeItemText, tempHour === h && styles.timeItemTextSelected]}>{h}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Minute Selection */}
              <View style={styles.timeColumn}>
                <Text style={styles.timeColTitle}>Min</Text>
                <ScrollView contentContainerStyle={styles.timeScrollContent}>
                  {minutesList.map(m => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.timeItem, tempMinute === m && styles.timeItemSelected]}
                      onPress={() => setTempMinute(m)}
                    >
                      <Text style={[styles.timeItemText, tempMinute === m && styles.timeItemTextSelected]}>{m}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* AM / PM Selection */}
              <View style={styles.ampmColumn}>
                <TouchableOpacity
                  style={[styles.ampmBtn, tempAmPm === 'AM' && styles.ampmBtnSelected]}
                  onPress={() => setTempAmPm('AM')}
                >
                  <Text style={[styles.ampmText, tempAmPm === 'AM' && styles.ampmTextSelected]}>AM</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.ampmBtn, tempAmPm === 'PM' && styles.ampmBtnSelected]}
                  onPress={() => setTempAmPm('PM')}
                >
                  <Text style={[styles.ampmText, tempAmPm === 'PM' && styles.ampmTextSelected]}>PM</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.timeConfirmBtn}
              onPress={confirmTime}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={PRIMARY_GRADIENT}
                style={styles.gradientBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.submitBtnText}>Confirm Time</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
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
  dateLabel: {
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
  keyboardContainer: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.md,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.03)',
    ...Theme.shadow.md,
  },
  cardHeading: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.75,
    marginBottom: Theme.spacing.sm,
  },
  cardContent: {
    gap: Theme.spacing.md,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: moderateScale(12),
    paddingHorizontal: Theme.spacing.md,
    gap: Theme.spacing.sm,
  },
  selectButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(14),
    color: Colors.text,
    flex: 1,
  },
  chevronIcon: {
    marginLeft: 'auto',
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  timeSelectBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: moderateScale(10),
    paddingHorizontal: Theme.spacing.sm,
    alignItems: 'center',
  },
  timeLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontSize: moderateScale(10),
  },
  timeValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.text,
    marginTop: 4,
  },
  timingSpacer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginBottom: -4,
  },
  textInput: {
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Theme.borderRadius.md,
    paddingVertical: moderateScale(10),
    paddingHorizontal: Theme.spacing.md,
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  textArea: {
    height: moderateScale(80),
  },
  submitBtn: {
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    marginTop: Theme.spacing.md,
    ...Theme.shadow.md,
  },
  gradientBtn: {
    paddingVertical: moderateScale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.white,
  },
  // Modal Overlays
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Theme.borderRadius.xxl,
    borderTopRightRadius: Theme.borderRadius.xxl,
    paddingBottom: moderateScale(24),
  },
  timeModalSheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Theme.borderRadius.xxl,
    borderTopRightRadius: Theme.borderRadius.xxl,
    paddingBottom: moderateScale(24),
    height: moderateScale(360),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.text,
    flex: 1,
  },
  modalClose: {
    padding: 4,
  },
  // Calendar styles
  calendarContainer: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  monthNavBtn: {
    padding: 8,
  },
  calendarMonthYearText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(15),
    color: Colors.text,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xs,
  },
  weekdayText: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(11),
    color: Colors.textMuted,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(100),
  },
  dayCellSelected: {
    borderRadius: moderateScale(100),
  },
  dayCellInactive: {
    opacity: 0.4,
  },
  daySelectedGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(100),
  },
  dayCellText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(13),
    color: Colors.text,
  },
  dayCellTextSelected: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(13),
    color: Colors.white,
  },
  dayCellTextToday: {
    color: Colors.primary,
    fontFamily: 'Outfit_700Bold',
  },
  dayCellTextInactive: {
    color: Colors.textMuted,
  },
  // Time picker styles
  timePickerContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.sm,
  },
  timeColumn: {
    flex: 1,
    alignItems: 'center',
  },
  timeColTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: Colors.textMuted,
    marginBottom: Theme.spacing.xs,
  },
  timeScrollContent: {
    alignItems: 'center',
    paddingBottom: 40,
  },
  timeItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    width: 60,
    alignItems: 'center',
    marginVertical: 2,
  },
  timeItemSelected: {
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
  },
  timeItemText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(16),
    color: Colors.textSecondary,
  },
  timeItemTextSelected: {
    color: Colors.primary,
    fontFamily: 'Outfit_700Bold',
  },
  ampmColumn: {
    width: 60,
    justifyContent: 'center',
    gap: Theme.spacing.sm,
  },
  ampmBtn: {
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ampmBtnSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  ampmText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.textSecondary,
  },
  ampmTextSelected: {
    color: Colors.white,
  },
  timeConfirmBtn: {
    marginHorizontal: Theme.spacing.lg,
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
  },
});

export default ApplyPersonalWorkScreen;

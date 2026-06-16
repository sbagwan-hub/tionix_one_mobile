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
import { ApiError } from '../../../services/apiClient';
import { getAuthSession } from '../../auth/services/auth';
import { applyForLeave, getLeaveBalances } from '../services/leave';

const PRIMARY_GRADIENT = Colors.primaryGradient;

type RangeDateItem = {
  dateStr: string;
  isSelected: boolean;
  workingType: string;
  leaveTypeId: string;
};

type DraftItem = {
  id: string;
  requestNo: string;
  employeeName: string;
  leaveTypeLabel: string;
  leaveTypeId: string;
  workingType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  remarks: string;
  rangeDates?: RangeDateItem[];
};

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
};

const formatDisplayDate = (value: string) => {
  if (!value) {
    return 'Select date';
  }
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
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

const MOCK_EMPLOYEES = ['SUPERVISOR', 'AVINASH MAGAR', 'JOHN DOE', 'JANE SMITH'];
const WORKING_TYPES = ['Full Day', 'First Half', 'Second Half', 'Work From Home', 'On Duty'];

const APP_LEAVE_TYPES = [
  { id: 'annual', label: 'Annual Leave', icon: 'ribbon-outline' },
  { id: 'holiday', label: 'Paid Holiday', icon: 'calendar-outline' },
  { id: 'sick', label: 'Sick Leave', icon: 'medkit-outline' },
  { id: 'paidCasual', label: 'Paid Casual Leave', icon: 'sunny-outline' },
  { id: 'unpaidCasual', label: 'Unpaid Casual Leave', icon: 'wallet-outline' },
  { id: 'unpaid', label: 'Unpaid Leave', icon: 'wallet-outline' },
  { id: 'absent', label: 'Absent', icon: 'close-circle-outline' },
  { id: 'restDay', label: 'Rest Day', icon: 'bed-outline' },
  { id: 'maternity', label: 'Maternity Leave', icon: 'heart-outline' },
];

const ApplyLeaveScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  // 1. ERP Metadata State
  const [requestNo, setRequestNo] = useState('CE/26-27/LR0012');
  const [requestDate, setRequestDate] = useState('05-Jun-2026');
  const [employeeName, setEmployeeName] = useState('SUPERVISOR');

  // 2. Form Fields State
  const [startDate, setStartDate] = useState(toDateInput(new Date()));
  const [endDate, setEndDate] = useState(toDateInput(getTomorrowDate()));
  const [hasSelectedDates, setHasSelectedDates] = useState(false);
  const [leaveTypeId, setLeaveTypeId] = useState(APP_LEAVE_TYPES[0].id);
  const [workingType, setWorkingType] = useState('Full Day');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');

  // Calendar states & logic
  const CALENDAR_MONTHS = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'start' | 'end'>('start');
  const [currentCalendarMonth, setCurrentCalendarMonth] = useState(new Date().getMonth());
  const [currentCalendarYear, setCurrentCalendarYear] = useState(new Date().getFullYear());

  const getDaysInMonth = useCallback((year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  }, []);

  const getFirstDayOfMonth = useCallback((year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  }, []);

  const handleOpenCalendar = useCallback((target: 'start' | 'end') => {
    setCalendarTarget(target);
    const initialDateStr = target === 'start' ? startDate : endDate;
    let initialDate = new Date();
    if (initialDateStr) {
      const parsed = new Date(`${initialDateStr}T00:00:00`);
      if (!isNaN(parsed.getTime())) {
        initialDate = parsed;
      }
    }
    setCurrentCalendarMonth(initialDate.getMonth());
    setCurrentCalendarYear(initialDate.getFullYear());
    setIsCalendarOpen(true);
  }, [startDate, endDate]);

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

  const handleSelectDate = useCallback((dateStr: string) => {
    setHasSelectedDates(true);
    if (calendarTarget === 'start') {
      setStartDate(dateStr);
      if (new Date(`${endDate}T00:00:00`) < new Date(`${dateStr}T00:00:00`)) {
        setEndDate(dateStr);
      }
      if (workingType !== 'Full Day') {
        setEndDate(dateStr);
      }
    } else {
      if (new Date(`${dateStr}T00:00:00`) < new Date(`${startDate}T00:00:00`)) {
        Toast.show({
          type: 'error',
          text1: 'Invalid Range',
          text2: 'End date cannot be before start date.',
          position: 'top',
          topOffset: 60,
        });
      } else {
        setEndDate(dateStr);
      }
    }
    setIsCalendarOpen(false);
  }, [calendarTarget, startDate, endDate, workingType]);

  const calendarDaysGrid = useMemo(() => {
    const totalDays = getDaysInMonth(currentCalendarYear, currentCalendarMonth);
    const firstDayIndex = getFirstDayOfMonth(currentCalendarYear, currentCalendarMonth);

    const prevMonthYear = currentCalendarMonth === 0 ? currentCalendarYear - 1 : currentCalendarYear;
    const prevMonth = currentCalendarMonth === 0 ? 11 : currentCalendarMonth - 1;
    const totalDaysPrev = getDaysInMonth(prevMonthYear, prevMonth);

    const grid = [];
    const today = new Date();
    const todayStr = toDateInput(today);

    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = totalDaysPrev - i;
      const mm = String(prevMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateString = `${prevMonthYear}-${mm}-${dd}`;
      grid.push({
        day,
        month: prevMonth,
        year: prevMonthYear,
        dateString,
        isToday: dateString === todayStr,
      });
    }

    for (let day = 1; day <= totalDays; day++) {
      const mm = String(currentCalendarMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateString = `${currentCalendarYear}-${mm}-${dd}`;
      grid.push({
        day,
        month: currentCalendarMonth,
        year: currentCalendarYear,
        dateString,
        isToday: dateString === todayStr,
      });
    }

    const remainingSlots = grid.length % 7;
    if (remainingSlots > 0) {
      const nextMonthYear = currentCalendarMonth === 11 ? currentCalendarYear + 1 : currentCalendarYear;
      const nextMonth = currentCalendarMonth === 11 ? 0 : currentCalendarMonth + 1;
      const slotsToAdd = 7 - remainingSlots;
      for (let day = 1; day <= slotsToAdd; day++) {
        const mm = String(nextMonth + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const dateString = `${nextMonthYear}-${mm}-${dd}`;
        grid.push({
          day,
          month: nextMonth,
          year: nextMonthYear,
          dateString,
          isToday: dateString === todayStr,
        });
      }
    }

    return grid;
  }, [currentCalendarMonth, currentCalendarYear, getDaysInMonth, getFirstDayOfMonth]);

  // 3. Dropdown Pickers State
  const [isLeaveTypePickerOpen, setIsLeaveTypePickerOpen] = useState(false);
  const [isWorkingTypePickerOpen, setIsWorkingTypePickerOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [rangeItemPickerIndex, setRangeItemPickerIndex] = useState<number | null>(null);
  const [isRangeLeaveTypePickerOpen, setIsRangeLeaveTypePickerOpen] = useState(false);
  const [isRangeWorkingTypePickerOpen, setIsRangeWorkingTypePickerOpen] = useState(false);

  // 4. Draft List & Editing state
  const [draftList, setDraftList] = useState<DraftItem[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  // 5. Loading / Action Statuses
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 6. ERP Leave Balances
  const [balances, setBalances] = useState({
    annual: 0.0,
    paidHoliday: 0.0,
    sick: 0.0,
    paidCasual: 0.0,
    unpaidCasual: 0.0,
  });

  // Init metadata and balances
  useEffect(() => {
    const initData = async () => {
      try {
        const session = await getAuthSession();
        if (session?.user?.UserName) {
          setEmployeeName(session.user.UserName.toUpperCase());
        }
      } catch (e) {
        console.warn('Failed to load session details', e);
      }

      try {
        const fetchedBalances = await getLeaveBalances();
        const updated = { ...balances };
        fetchedBalances.forEach(item => {
          const remaining = item.remaining ?? 0;
          const id = item.id.toLowerCase();
          if (id === 'annual' || id === 'earned') {
            updated.annual = remaining;
          } else if (id === 'sick') {
            updated.sick = remaining;
          } else if (id === 'paid-casual') {
            updated.paidCasual = remaining;
          } else if (id === 'paid-holiday') {
            updated.paidHoliday = remaining;
          } else if (id === 'unpaid-casual' || id === 'unpaid') {
            updated.unpaidCasual = remaining;
          }
        });
        setBalances(updated);
      } catch (e) {
        console.warn('Failed to load leave balances', e);
      }
    };

    initData();

    // Prefill request date & generate request number
    const today = new Date();
    const formatted = today.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).replace(/ /g, '-');
    setRequestDate(formatted);

    const rand = Math.floor(100 + Math.random() * 900);
    const yy = String(today.getFullYear()).slice(-2);
    const ny = String(today.getFullYear() + 1).slice(-2);
    setRequestNo(`CE/${yy}-${ny}/LR${rand}`);
  }, []);

  // 7. Dynamic range checklist state
  const [rangeDates, setRangeDates] = useState<RangeDateItem[]>([]);

  // Regenerate range list when startDate or endDate changes
  useEffect(() => {
    if (!startDate || !endDate) {
      setRangeDates([]);
      return;
    }
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      setRangeDates([]);
      return;
    }

    setRangeDates(prev => {
      const items: RangeDateItem[] = [];
      const current = new Date(start);
      while (current <= end) {
        const dateStr = toDateInput(current);
        const existing = prev.find(item => item.dateStr === dateStr);
        if (existing) {
          items.push(existing);
        } else {
          items.push({
            dateStr,
            isSelected: true,
            workingType: workingType,
            leaveTypeId: leaveTypeId,
          });
        }
        current.setDate(current.getDate() + 1);
      }
      return items;
    });
  }, [startDate, endDate]);

  // Sync main working type change to all days in range
  useEffect(() => {
    setRangeDates(prev => prev.map(item => ({ ...item, workingType })));
  }, [workingType]);

  // Sync main leave type change to all days in range
  useEffect(() => {
    setRangeDates(prev => prev.map(item => ({ ...item, leaveTypeId })));
  }, [leaveTypeId]);

  const selectedLeaveType = useMemo(
    () => APP_LEAVE_TYPES.find(type => type.id === leaveTypeId) ?? APP_LEAVE_TYPES[0],
    [leaveTypeId],
  );

  // Active form calculated days (summing up enabled days in the checklist)
  const activeFormDays = useMemo(() => {
    return rangeDates
      .filter(item => item.isSelected)
      .reduce((sum, item) => {
        if (item.workingType === 'First Half' || item.workingType === 'Second Half') {
          return sum + 0.5;
        }
        return sum + 1.0;
      }, 0);
  }, [rangeDates]);

  // Total applied leave days (Active Form + Drafts)
  const totalAppliedDays = useMemo(() => {
    const draftTotal = draftList.reduce((acc, item) => acc + item.days, 0);
    return draftTotal + activeFormDays;
  }, [draftList, activeFormDays]);

  // Leave Summary totals
  const summaryMetrics = useMemo(() => {
    const totalDrafts = draftList.reduce((acc, item) => acc + item.days, 0);
    const active = activeFormDays;
    const totalApplied = totalDrafts + active;
    const totalAvailable = balances.annual + balances.paidHoliday + balances.sick + balances.paidCasual;

    return {
      totalApplied,
      remaining: Math.max(0, totalAvailable - totalApplied),
      approved: 4.5, // Mock approved leaves this month
      pending: 2.0, // Mock pending leaves
    };
  }, [balances, draftList, activeFormDays]);

  // Dynamic breakdown of applied leaves based on custom categories
  const appliedBreakdown = useMemo(() => {
    const breakdown = {
      annual: 0,
      holiday: 0,
      sick: 0,
      paidCasual: 0,
      unpaidCasual: 0,
      unpaid: 0,
      absent: 0,
      restDay: 0,
      maternity: 0,
    };

    // Aggregate from drafts
    draftList.forEach(item => {
      const type = item.leaveTypeId;
      if (type in breakdown) {
        breakdown[type as keyof typeof breakdown] += item.days;
      }
    });

    // Add current active form entry if valid
    const activeType = leaveTypeId;
    if (activeType in breakdown) {
      breakdown[activeType as keyof typeof breakdown] += activeFormDays;
    }

    return breakdown;
  }, [draftList, leaveTypeId, activeFormDays]);

  const handleToggleRangeDate = (index: number) => {
    setRangeDates(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        isSelected: !copy[index].isSelected,
      };
      return copy;
    });
  };

  const handleOpenRangeWorkingTypePicker = (index: number) => {
    setRangeItemPickerIndex(index);
    setIsRangeWorkingTypePickerOpen(true);
  };

  const handleOpenRangeLeaveTypePicker = (index: number) => {
    setRangeItemPickerIndex(index);
    setIsRangeLeaveTypePickerOpen(true);
  };

  const handleSelectRangeWorkingType = (value: string) => {
    if (rangeItemPickerIndex === null) return;
    setRangeDates(prev => {
      const copy = [...prev];
      copy[rangeItemPickerIndex] = {
        ...copy[rangeItemPickerIndex],
        workingType: value,
      };
      return copy;
    });
    setIsRangeWorkingTypePickerOpen(false);
    setRangeItemPickerIndex(null);
  };

  const handleSelectRangeLeaveType = (value: string) => {
    if (rangeItemPickerIndex === null) return;
    setRangeDates(prev => {
      const copy = [...prev];
      copy[rangeItemPickerIndex] = {
        ...copy[rangeItemPickerIndex],
        leaveTypeId: value,
      };
      return copy;
    });
    setIsRangeLeaveTypePickerOpen(false);
    setRangeItemPickerIndex(null);
  };

  const resetForm = () => {
    setStartDate(toDateInput(new Date()));
    setEndDate(toDateInput(getTomorrowDate()));
    setLeaveTypeId(APP_LEAVE_TYPES[0].id);
    setWorkingType('Full Day');
    setReason('');
    setRemarks('');
    setEditingDraftId(null);
    setErrorMessage(null);
    setRangeDates([]);
    setHasSelectedDates(false);
  };

  const handleSaveDraft = () => {
    setErrorMessage(null);
    const trimmedReason = reason.trim();
    if (!startDate || !endDate) {
      setErrorMessage('Please select start and end dates before saving draft.');
      return;
    }
    if (new Date(`${endDate}T00:00:00`) < new Date(`${startDate}T00:00:00`)) {
      setErrorMessage('End date cannot be before start date.');
      return;
    }
    if (trimmedReason.length < 5) {
      setErrorMessage('Please enter a reason (at least 5 characters) to save a draft.');
      return;
    }

    if (editingDraftId) {
      // Update existing draft
      setDraftList(prev => prev.map(item => {
        if (item.id === editingDraftId) {
          return {
            ...item,
            employeeName,
            leaveTypeLabel: selectedLeaveType.label,
            leaveTypeId,
            workingType,
            startDate,
            endDate,
            days: activeFormDays,
            reason: trimmedReason,
            remarks: remarks.trim(),
            rangeDates: rangeDates,
          };
        }
        return item;
      }));
      Toast.show({
        type: 'success',
        text1: 'Draft updated',
        text2: 'The draft item has been updated in the list.',
        position: 'top',
        topOffset: 60,
      });
    } else {
      // Add new draft
      const newDraft: DraftItem = {
        id: String(Date.now()),
        requestNo,
        employeeName,
        leaveTypeLabel: selectedLeaveType.label,
        leaveTypeId,
        workingType,
        startDate,
        endDate,
        days: activeFormDays,
        reason: trimmedReason,
        remarks: remarks.trim(),
        rangeDates: rangeDates,
      };
      setDraftList(prev => [...prev, newDraft]);
      Toast.show({
        type: 'success',
        text1: 'Draft saved',
        text2: 'The item has been added to the draft list below.',
        position: 'top',
        topOffset: 60,
      });
    }

    resetForm();
  };

  const handleEditDraft = (item: DraftItem) => {
    setEditingDraftId(item.id);
    setEmployeeName(item.employeeName);
    setLeaveTypeId(item.leaveTypeId);
    setWorkingType(item.workingType);
    setStartDate(item.startDate);
    setEndDate(item.endDate);
    setReason(item.reason);
    setRemarks(item.remarks);
    setHasSelectedDates(true);
    if (item.rangeDates) {
      setRangeDates(item.rangeDates);
    }
  };

  const handleDeleteDraft = (id: string) => {
    setDraftList(prev => prev.filter(item => item.id !== id));
    if (editingDraftId === id) {
      resetForm();
    }
    Toast.show({
      type: 'info',
      text1: 'Draft removed',
      text2: 'The draft item has been removed from the list.',
      position: 'top',
      topOffset: 60,
    });
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    const trimmedReason = reason.trim();

    // Check if we are submitting drafts, or submitting the current form
    const itemsToSubmit: Array<{
      leaveType: string;
      startDate: string;
      endDate: string;
      reason: string;
      isHalfDay: boolean;
    }> = [];

    // If there is active form content, validate and prepare it
    if (trimmedReason || startDate !== toDateInput(new Date())) {
      if (!startDate || !endDate) {
        setErrorMessage('Please select start and end dates.');
        return;
      }
      if (new Date(`${endDate}T00:00:00`) < new Date(`${startDate}T00:00:00`)) {
        setErrorMessage('End date cannot be before start date.');
        return;
      }
      if (trimmedReason.length < 5) {
        setErrorMessage('Please enter a reason (at least 5 characters).');
        return;
      }

      const checkedDates = rangeDates.filter(d => d.isSelected);
      if (checkedDates.length === 0) {
        setErrorMessage('No days are selected in the date range checklist.');
        return;
      }

      const finalReason = remarks.trim()
        ? `${trimmedReason} (Remarks: ${remarks.trim()})`
        : trimmedReason;

      checkedDates.forEach(d => {
        const typeLabel = APP_LEAVE_TYPES.find(t => t.id === d.leaveTypeId)?.label || selectedLeaveType.label;
        itemsToSubmit.push({
          leaveType: typeLabel,
          startDate: d.dateStr,
          endDate: d.dateStr,
          reason: finalReason,
          isHalfDay: d.workingType === 'First Half' || d.workingType === 'Second Half',
        });
      });
    }

    // Append all drafts
    draftList.forEach(draft => {
      const finalReason = draft.remarks
        ? `${draft.reason} (Remarks: ${draft.remarks})`
        : draft.reason;

      if (draft.rangeDates && draft.rangeDates.length > 0) {
        const checked = draft.rangeDates.filter(d => d.isSelected);
        checked.forEach(d => {
          const typeLabel = APP_LEAVE_TYPES.find(t => t.id === d.leaveTypeId)?.label || draft.leaveTypeLabel;
          itemsToSubmit.push({
            leaveType: typeLabel,
            startDate: d.dateStr,
            endDate: d.dateStr,
            reason: finalReason,
            isHalfDay: d.workingType === 'First Half' || d.workingType === 'Second Half',
          });
        });
      } else {
        itemsToSubmit.push({
          leaveType: draft.leaveTypeLabel,
          startDate: draft.startDate,
          endDate: draft.endDate,
          reason: finalReason,
          isHalfDay: draft.workingType === 'First Half' || draft.workingType === 'Second Half',
        });
      }
    });

    if (itemsToSubmit.length === 0) {
      setErrorMessage('Please fill in the leave form or add drafts before submitting.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit each request sequentially
      for (const item of itemsToSubmit) {
        await applyForLeave(item);
      }

      Toast.show({
        type: 'success',
        text1: 'Leave request(s) submitted',
        text2: `Successfully submitted ${itemsToSubmit.length} leave request(s).`,
        position: 'top',
        topOffset: 60,
      });

      setDraftList([]);
      resetForm();
      navigation.goBack();
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Unable to submit leave request right now.';
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* 1. Custom Gradient AppBar Header */}
      <View style={styles.appBarContainer}>
        <LinearGradient
          colors={PRIMARY_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerGradient}
        >
          <SafeAreaView edges={['top']} style={styles.headerSafeArea}>
            <View style={styles.headerRow}>
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={22} color={Colors.white} />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Leave Request</Text>
              <View style={styles.headerRightGroup}>
                <TouchableOpacity style={styles.headerIconBtn} onPress={handleSaveDraft}>
                  <Ionicons name="save-outline" size={22} color={Colors.white} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerIconBtn} onPress={() => setIsMoreMenuOpen(true)}>
                  <Ionicons name="ellipsis-vertical" size={22} color={Colors.white} />
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>

      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: moderateScale(180) + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* 2. Leave Balance Cards (Grid styled like Monthly Summary) */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardHeading}>Leave Balances</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Annual Leave</Text>
                <Text style={[styles.metricValue, { color: '#E97132' }]}>
                  {balances.annual.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Paid Holiday</Text>
                <Text style={[styles.metricValue, { color: '#3B82F6' }]}>
                  {balances.paidHoliday.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Sick Leave</Text>
                <Text style={[styles.metricValue, { color: '#EF4444' }]}>
                  {balances.sick.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Paid Casual</Text>
                <Text style={[styles.metricValue, { color: '#22C55E' }]}>
                  {balances.paidCasual.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Unpaid Leave</Text>
                <Text style={[styles.metricValue, { color: '#6B7280' }]}>
                  {balances.unpaidCasual.toFixed(1)} D
                </Text>
              </View>
            </View>
          </View>

          {/* 3. Leave Summary Metrics Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardHeading}>Monthly Summary</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Total Applied</Text>
                <Text style={[styles.metricValue, { color: Colors.primary }]}>
                  {summaryMetrics.totalApplied.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Remaining</Text>
                <Text style={[styles.metricValue, { color: Colors.success }]}>
                  {summaryMetrics.remaining.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Approved</Text>
                <Text style={[styles.metricValue, { color: '#3B82F6' }]}>
                  {summaryMetrics.approved.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Pending</Text>
                <Text style={[styles.metricValue, { color: Colors.warning }]}>
                  {summaryMetrics.pending.toFixed(1)} D
                </Text>
              </View>
            </View>
          </View>

          {/* Applied Leave Breakdown Card (Desktop ERP Redesign Style) */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardHeading}>Applied Leave Breakdown</Text>
            <View style={styles.breakdownList}>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Absent Applied</Text>
                <Text style={[styles.breakdownValue, appliedBreakdown.absent > 0 && styles.breakdownValueActive]}>
                  {appliedBreakdown.absent.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Rest Day Applied</Text>
                <Text style={[styles.breakdownValue, appliedBreakdown.restDay > 0 && styles.breakdownValueActive]}>
                  {appliedBreakdown.restDay.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Unpaid Leave Applied</Text>
                <Text style={[styles.breakdownValue, appliedBreakdown.unpaid > 0 && styles.breakdownValueActive]}>
                  {appliedBreakdown.unpaid.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Paid Holiday Applied</Text>
                <Text style={[styles.breakdownValue, appliedBreakdown.holiday > 0 && styles.breakdownValueActive]}>
                  {appliedBreakdown.holiday.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Sick Leave Applied</Text>
                <Text style={[styles.breakdownValue, appliedBreakdown.sick > 0 && styles.breakdownValueActive]}>
                  {appliedBreakdown.sick.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Annual Leave Applied</Text>
                <Text style={[styles.breakdownValue, appliedBreakdown.annual > 0 && styles.breakdownValueActive]}>
                  {appliedBreakdown.annual.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Paid Casual Leave Applied</Text>
                <Text style={[styles.breakdownValue, appliedBreakdown.paidCasual > 0 && styles.breakdownValueActive]}>
                  {appliedBreakdown.paidCasual.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Unpaid Casual Leave Applied</Text>
                <Text style={[styles.breakdownValue, appliedBreakdown.unpaidCasual > 0 && styles.breakdownValueActive]}>
                  {appliedBreakdown.unpaidCasual.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Maternity Leave Applied</Text>
                <Text style={[styles.breakdownValue, appliedBreakdown.maternity > 0 && styles.breakdownValueActive]}>
                  {appliedBreakdown.maternity.toFixed(1)} D
                </Text>
              </View>
              <View style={styles.breakdownTotalRow}>
                <Text style={styles.breakdownTotalLabel}>Total Leave Applied</Text>
                <Text style={styles.breakdownTotalValue}>
                  {totalAppliedDays.toFixed(1)} D
                </Text>
              </View>
            </View>
          </View>

          {/* 4. Form Section: Request Details */}
          <FormCard title="Request Info">
            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.inputLabel}>Request Number</Text>
                <View style={styles.disabledInputRow}>
                  <Text style={styles.disabledInputText}>{requestNo}</Text>
                </View>
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.inputLabel}>Request Date</Text>
                <View style={styles.disabledInputRow}>
                  <Text style={styles.disabledInputText}>{requestDate}</Text>
                </View>
              </View>
            </View>

            <Text style={[styles.inputLabel, { marginTop: Theme.spacing.md }]}>Employee Name</Text>
            <View style={styles.disabledInputRow}>
              <Text style={styles.disabledInputText}>{employeeName}</Text>
            </View>
          </FormCard>

          {/* 5. Form Section: Date & Types */}
          <FormCard title="Leave & Duration">
            <View style={styles.row}>
              <View style={styles.halfCol}>
                <Text style={styles.inputLabel}>Leave Type</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setIsLeaveTypePickerOpen(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dropdownValueText}>{selectedLeaveType.label}</Text>
                  <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.inputLabel}>Working Type</Text>
                <TouchableOpacity
                  style={styles.dropdownTrigger}
                  onPress={() => setIsWorkingTypePickerOpen(true)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.dropdownValueText}>{workingType}</Text>
                  <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.row, { marginTop: Theme.spacing.md }]}>
              <View style={styles.halfCol}>
                <Text style={styles.inputLabel}>From Date</Text>
                <TouchableOpacity
                  style={styles.inputIconRow}
                  onPress={() => handleOpenCalendar('start')}
                  activeOpacity={0.8}
                >
                  <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                  <Text style={styles.dateValueText}>{formatDisplayDate(startDate)}</Text>
                </TouchableOpacity>
                <Text style={styles.hintText}>Tap to change</Text>
              </View>

              <View style={styles.halfCol}>
                <Text style={styles.inputLabel}>To Date</Text>
                <TouchableOpacity
                  style={[
                    styles.inputIconRow,
                    workingType !== 'Full Day' && { backgroundColor: Colors.surfaceMuted }
                  ]}
                  onPress={() => workingType === 'Full Day' && handleOpenCalendar('end')}
                  activeOpacity={workingType === 'Full Day' ? 0.8 : 1}
                  disabled={workingType !== 'Full Day'}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={18}
                    color={workingType === 'Full Day' ? Colors.primary : Colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.dateValueText,
                      workingType !== 'Full Day' && { color: Colors.textMuted }
                    ]}
                  >
                    {workingType === 'Full Day' ? formatDisplayDate(endDate) : 'Disabled'}
                  </Text>
                </TouchableOpacity>
                <Text style={styles.hintText}>
                  {workingType === 'Full Day' ? 'Tap to change' : 'Disabled for Half Day'}
                </Text>
              </View>
            </View>
          </FormCard>

          {/* Dynamic Checklist of Days in Range */}
          {hasSelectedDates && rangeDates.length > 0 && (
            <FormCard title="Days in Selected Range">
              <Text style={styles.rangeHeadingHint}>
                Select days to include. Tap pills to cycle Working Type and Leave Type for individual days.
              </Text>
              <View style={styles.rangeDatesList}>
                {rangeDates.map((item, index) => {
                  const isChecked = item.isSelected;
                  const leaveTypeLabel = APP_LEAVE_TYPES.find(t => t.id === item.leaveTypeId)?.label || 'Leave';

                  return (
                    <View
                      key={item.dateStr}
                      style={[
                        styles.rangeItemRow,
                        !isChecked && styles.rangeItemDisabled
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.checkboxWrapper}
                        onPress={() => handleToggleRangeDate(index)}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
                          {isChecked && <Ionicons name="checkmark" size={12} color={Colors.white} />}
                        </View>
                        <View style={styles.rangeDateTextGroup}>
                          <Text style={styles.rangeDayText}>
                            {new Date(`${item.dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short' })}
                          </Text>
                          <Text style={styles.rangeDateText}>
                            {new Date(`${item.dateStr}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {isChecked && (
                        <View style={styles.rangeActions}>
                          {/* Working Type Dropdown Pill */}
                          <TouchableOpacity
                            style={styles.pillTrigger}
                            onPress={() => handleOpenRangeWorkingTypePicker(index)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.pillTriggerText}>{item.workingType}</Text>
                            <Ionicons name="chevron-down-outline" size={10} color={Colors.textSecondary} />
                          </TouchableOpacity>

                          {/* Leave Type Dropdown Pill */}
                          <TouchableOpacity
                            style={styles.pillTrigger}
                            onPress={() => handleOpenRangeLeaveTypePicker(index)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.pillTriggerText} numberOfLines={1}>
                              {leaveTypeLabel.replace(' Leave', '')}
                            </Text>
                            <Ionicons name="chevron-down-outline" size={10} color={Colors.textSecondary} />
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            </FormCard>
          )}

          {/* 6. Form Section: Reasons & Remarks */}
          <FormCard title="Justification">
            <Text style={styles.inputLabel}>Reason *</Text>
            <View style={styles.textAreaBox}>
              <TextInput
                value={reason}
                onChangeText={setReason}
                placeholder="Why do you need leave?..."
                placeholderTextColor={Colors.textMuted}
                style={styles.textArea}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                maxLength={300}
              />
            </View>
            <Text style={[styles.charCounter, { marginBottom: Theme.spacing.md }]}>
              {reason.trim().length}/300 characters
            </Text>

            <Text style={styles.inputLabel}>Remarks</Text>
            <View style={styles.textAreaBox}>
              <TextInput
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Additional notes for managers..."
                placeholderTextColor={Colors.textMuted}
                style={styles.textArea}
                multiline
                numberOfLines={2}
                textAlignVertical="top"
                maxLength={200}
              />
            </View>
            <Text style={styles.charCounter}>
              {remarks.trim().length}/200 characters
            </Text>
          </FormCard>

          {/* 7. Draft / Applied Leaves List */}
          {draftList.length > 0 && (
            <View style={styles.draftSection}>
              <Text style={styles.sectionHeading}>Draft Items ({draftList.length})</Text>
              {draftList.map(item => (
                <View key={item.id} style={styles.draftCard}>
                  <View style={styles.draftHeader}>
                    <View style={styles.draftTypeBadge}>
                      <Text style={styles.draftTypeBadgeText}>{item.leaveTypeLabel}</Text>
                    </View>
                    <Text style={styles.draftDaysText}>{item.days} Day{item.days === 1 ? '' : 's'}</Text>
                  </View>

                  <View style={styles.draftMetaRow}>
                    <Text style={styles.draftMetaLabel}>Period:</Text>
                    <Text style={styles.draftMetaValue}>
                      {formatDisplayDate(item.startDate)}
                      {item.startDate !== item.endDate ? ` → ${formatDisplayDate(item.endDate)}` : ''}
                    </Text>
                  </View>

                  <View style={styles.draftMetaRow}>
                    <Text style={styles.draftMetaLabel}>Working Type:</Text>
                    <Text style={styles.draftMetaValue}>{item.workingType}</Text>
                  </View>

                  <View style={styles.draftMetaRow}>
                    <Text style={styles.draftMetaLabel}>Reason:</Text>
                    <Text style={styles.draftMetaValue} numberOfLines={1}>{item.reason}</Text>
                  </View>

                  <View style={styles.draftActionsRow}>
                    <TouchableOpacity style={styles.draftEditBtn} onPress={() => handleEditDraft(item)}>
                      <Ionicons name="pencil-outline" size={16} color={Colors.accent} />
                      <Text style={styles.draftEditBtnText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.draftDeleteBtn} onPress={() => handleDeleteDraft(item.id)}>
                      <Ionicons name="trash-outline" size={16} color={Colors.error} />
                      <Text style={styles.draftDeleteBtnText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={18} color={Colors.error} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          )}

          {/* Dynamic bottom spacing is now handled via ScrollView paddingBottom */}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 8. Sticky Footer Action Row */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Theme.spacing.sm) }]}>
        <View style={styles.footerActionsContainer}>
          <View style={styles.footerSecondaryRow}>
            <TouchableOpacity style={styles.resetBtn} onPress={resetForm}>
              <Text style={styles.resetBtnText}>Reset Form</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.draftBtn} onPress={handleSaveDraft}>
              <Text style={styles.draftBtnText}>{editingDraftId ? 'Update Draft' : 'Add to Draft'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.submitBtnWrapper} onPress={handleSubmit} disabled={isSubmitting}>
            <LinearGradient
              colors={PRIMARY_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtnGradient}
            >
              <Text style={styles.submitBtnText}>Submit Request</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals for selectors */}
      {/* A. Leave Type Selector Modal */}
      <Modal visible={isLeaveTypePickerOpen} transparent animationType="fade" onRequestClose={() => setIsLeaveTypePickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsLeaveTypePickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Leave Type</Text>
              <TouchableOpacity onPress={() => setIsLeaveTypePickerOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {APP_LEAVE_TYPES.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setLeaveTypeId(type.id);
                    setIsLeaveTypePickerOpen(false);
                  }}
                >
                  <Text style={[styles.modalItemText, leaveTypeId === type.id && styles.modalItemTextActive]}>
                    {type.label}
                  </Text>
                  {leaveTypeId === type.id && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* C. Working Type Selector Modal */}
      <Modal visible={isWorkingTypePickerOpen} transparent animationType="fade" onRequestClose={() => setIsWorkingTypePickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsWorkingTypePickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Working Type</Text>
              <TouchableOpacity onPress={() => setIsWorkingTypePickerOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {WORKING_TYPES.map(wt => (
                <TouchableOpacity
                  key={wt}
                  style={styles.modalItem}
                  onPress={() => {
                    setWorkingType(wt);
                    if (wt !== 'Full Day') {
                      setEndDate(startDate); // For half-day, From and To are identical
                    }
                    setIsWorkingTypePickerOpen(false);
                  }}
                >
                  <Text style={[styles.modalItemText, workingType === wt && styles.modalItemTextActive]}>{wt}</Text>
                  {workingType === wt && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* C2. Range Item Working Type Selector Modal */}
      <Modal visible={isRangeWorkingTypePickerOpen} transparent animationType="fade" onRequestClose={() => setIsRangeWorkingTypePickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsRangeWorkingTypePickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Working Type</Text>
              <TouchableOpacity onPress={() => setIsRangeWorkingTypePickerOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {rangeItemPickerIndex !== null && ['Full Day', 'First Half', 'Second Half'].map(wt => (
                <TouchableOpacity
                  key={wt}
                  style={styles.modalItem}
                  onPress={() => handleSelectRangeWorkingType(wt)}
                >
                  <Text style={[styles.modalItemText, rangeDates[rangeItemPickerIndex]?.workingType === wt && styles.modalItemTextActive]}>
                    {wt}
                  </Text>
                  {rangeDates[rangeItemPickerIndex]?.workingType === wt && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* C3. Range Item Leave Type Selector Modal */}
      <Modal visible={isRangeLeaveTypePickerOpen} transparent animationType="fade" onRequestClose={() => setIsRangeLeaveTypePickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsRangeLeaveTypePickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Leave Type</Text>
              <TouchableOpacity onPress={() => setIsRangeLeaveTypePickerOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {rangeItemPickerIndex !== null && APP_LEAVE_TYPES.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={styles.modalItem}
                  onPress={() => handleSelectRangeLeaveType(type.id)}
                >
                  <Text style={[styles.modalItemText, rangeDates[rangeItemPickerIndex]?.leaveTypeId === type.id && styles.modalItemTextActive]}>
                    {type.label}
                  </Text>
                  {rangeDates[rangeItemPickerIndex]?.leaveTypeId === type.id && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* D. More Menu Actions Modal */}
      <Modal visible={isMoreMenuOpen} transparent animationType="fade" onRequestClose={() => setIsMoreMenuOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsMoreMenuOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Options</Text>
              <TouchableOpacity onPress={() => setIsMoreMenuOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                resetForm();
                setIsMoreMenuOpen(false);
              }}
            >
              <Ionicons name="refresh-outline" size={18} color={Colors.textSecondary} />
              <Text style={[styles.modalItemText, { marginLeft: 10 }]}>Reset Form</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalItem}
              onPress={() => {
                setDraftList([]);
                setIsMoreMenuOpen(false);
                Toast.show({
                  type: 'info',
                  text1: 'Drafts cleared',
                  text2: 'All saved drafts have been deleted.',
                });
              }}
            >
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
              <Text style={[styles.modalItemText, { marginLeft: 10, color: Colors.error }]}>Clear All Drafts</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Calendar Date Picker Modal */}
      <Modal
        visible={isCalendarOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsCalendarOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIsCalendarOpen(false)}>
          <Pressable style={[styles.modalSheet, { maxHeight: '80%' }]} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {calendarTarget === 'start' ? 'Start' : 'End'} Date
              </Text>
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
                  const isSelected = dayObj.dateString === (calendarTarget === 'start' ? startDate : endDate);
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
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.surface, // Clean white card surface structure
  },
  flex: {
    flex: 1,
  },
  appBarContainer: {
    overflow: 'hidden',
    ...Theme.shadow.md,
  },
  headerGradient: {
    paddingBottom: Theme.spacing.md,
  },
  headerSafeArea: {
    backgroundColor: 'transparent',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    height: 56,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: moderateScale(19),
    color: Colors.white,
    fontWeight: '800',
    flex: 1,
    textAlign: 'center',
    marginLeft: Theme.spacing.md,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerRightGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  content: {
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  balancesSection: {
    gap: Theme.spacing.sm,
  },
  sectionHeading: {
    ...Typography.label,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    marginLeft: 4,
  },

  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.md,
    borderWidth: 0,
    ...Theme.shadow.card,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: Theme.spacing.sm,
  },
  metricBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
    borderWidth: 0,
    gap: 2,
  },
  metricLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    fontSize: moderateScale(11),
  },
  metricValue: {
    ...Typography.subheading,
    fontWeight: '800',
    fontSize: moderateScale(16),
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.md,
    borderWidth: 0,
    ...Theme.shadow.card,
  },
  cardHeading: {
    ...Typography.subheading,
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: Colors.text,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingBottom: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
  },
  cardContent: {
    gap: Theme.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  halfCol: {
    flex: 1,
  },
  inputLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
  },
  disabledInputRow: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    height: moderateScale(48),
    justifyContent: 'center',
  },
  disabledInputText: {
    ...Typography.body,
    color: Colors.textMuted,
    fontWeight: '700',
  },
  dropdownTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    height: moderateScale(48),
  },
  dropdownValueText: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '600',
  },
  inputIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Theme.spacing.md,
    height: moderateScale(48),
  },
  textInput: {
    flex: 1,
    ...Typography.body,
    color: Colors.text,
    padding: 0,
    fontWeight: '600',
  },
  hintText: {
    ...Typography.caption,
    marginTop: 4,
    color: Colors.textMuted,
  },
  textAreaBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Theme.borderRadius.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
  },
  textArea: {
    ...Typography.body,
    color: Colors.text,
    minHeight: moderateScale(60),
    lineHeight: moderateScale(20),
    padding: 0,
  },
  charCounter: {
    ...Typography.caption,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: 4,
  },
  draftSection: {
    gap: Theme.spacing.sm,
  },
  draftCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.md,
    borderWidth: 0,
    ...Theme.shadow.md,
    gap: Theme.spacing.xs,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  draftTypeBadge: {
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.pill,
  },
  draftTypeBadgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '800',
    fontSize: moderateScale(11),
  },
  draftDaysText: {
    ...Typography.subheading,
    color: Colors.text,
    fontWeight: '800',
    fontSize: moderateScale(14),
  },
  draftMetaRow: {
    flexDirection: 'row',
    gap: 8,
  },
  draftMetaLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
    width: 90,
  },
  draftMetaValue: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.text,
    flex: 1,
  },
  draftActionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Theme.spacing.md,
    marginTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Theme.spacing.sm,
  },
  draftEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  draftEditBtnText: {
    ...Typography.caption,
    color: Colors.accent,
    fontWeight: '800',
  },
  draftDeleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  draftDeleteBtnText: {
    ...Typography.caption,
    color: Colors.error,
    fontWeight: '800',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  errorText: {
    ...Typography.caption,
    color: Colors.error,
    flex: 1,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Theme.spacing.md,
    paddingTop: Theme.spacing.sm,
    ...Theme.shadow.floating,
  },
  footerActionsContainer: {
    gap: 8,
  },
  footerSecondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  resetBtn: {
    flex: 1,
    height: moderateScale(46),
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    backgroundColor: Colors.white,
  },
  resetBtnText: {
    ...Typography.body,
    color: Colors.textSecondary,
    fontWeight: '800',
  },
  draftBtn: {
    flex: 1.5,
    height: moderateScale(46),
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
  },
  draftBtnText: {
    ...Typography.body,
    color: Colors.primary,
    fontWeight: '800',
  },
  submitBtnWrapper: {
    width: '100%',
    height: moderateScale(48),
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
    marginBottom: moderateScale(4),
  },
  submitBtnGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    paddingHorizontal: Theme.spacing.md,
    paddingBottom: Theme.spacing.md,
  },
  modalSheet: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    maxHeight: '60%',
    overflow: 'hidden',
    ...Theme.shadow.floating,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    ...Typography.subheading,
    fontWeight: '800',
    color: Colors.text,
  },
  modalClose: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalItemText: {
    ...Typography.body,
    color: Colors.text,
  },
  modalItemTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  dateValueText: {
    ...Typography.body,
    color: Colors.text,
    fontWeight: '700',
  },
  calendarContainer: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.md,
  },
  monthNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthYearText: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.sm,
  },
  weekdayText: {
    ...Typography.caption,
    fontSize: moderateScale(12),
    color: Colors.textMuted,
    width: '14.28%',
    textAlign: 'center',
    fontWeight: '700',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 8,
  },
  dayCell: {
    width: '14.28%',
    height: moderateScale(38),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
  },
  dayCellSelected: {
    // handled by LinearGradient
  },
  dayCellInactive: {
    opacity: 0.4,
  },
  dayCellText: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.text,
    fontWeight: '600',
  },
  daySelectedGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellTextSelected: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.white,
    fontWeight: '800',
  },
  dayCellTextToday: {
    color: Colors.primary,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  dayCellTextInactive: {
    color: Colors.textMuted,
  },
  breakdownList: {
    gap: Theme.spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.xs,
  },
  breakdownLabel: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
  },
  breakdownValue: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(13),
    color: Colors.textMuted,
  },
  breakdownValueActive: {
    color: Colors.primary,
    fontFamily: 'Outfit_700Bold',
  },
  breakdownTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1.5,
    borderTopColor: Colors.primary,
    marginTop: Theme.spacing.xs,
  },
  breakdownTotalLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  breakdownTotalValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.primary,
  },
  rangeHeadingHint: {
    ...Typography.caption,
    fontSize: moderateScale(12),
    color: Colors.textMuted,
    marginBottom: Theme.spacing.md,
    lineHeight: 16,
  },
  rangeDatesList: {
    gap: 8,
  },
  rangeItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  rangeItemDisabled: {
    opacity: 0.55,
  },
  checkboxWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rangeDateTextGroup: {
    flexDirection: 'column',
  },
  rangeDayText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(13),
    color: Colors.text,
  },
  rangeDateText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    marginTop: 1,
  },
  rangeActions: {
    flexDirection: 'row',
    gap: Theme.spacing.xs,
  },
  pillTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    paddingVertical: 5,
    paddingHorizontal: Theme.spacing.xs + 2,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: Colors.border,
    gap: 4,
  },
  pillTriggerText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(10),
    color: Colors.textSecondary,
  },
});

export default ApplyLeaveScreen;

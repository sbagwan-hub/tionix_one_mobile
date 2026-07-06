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
  Image,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import AppBar from '../../../components/AppBar';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { ApiError } from '../../../services/apiClient';
import { getAuthSession } from '../../auth/services/auth';
import { getEmployeeProfile } from '../../profile/services/profile';
import { applyForLeave, getLeaveBalances, getLeaveTypes, LeaveType, getLeaveHistory, LeaveRequest, uploadLeaveAttachment } from '../services/leave';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';

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
  attachmentUri?: string | null;
  attachmentName?: string | null;
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

const formatDateInput = (dateStr: string) => {
  if (!dateStr) return 'mm/dd/yyyy';
  try {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}/${dd}/${yyyy}`;
  } catch {
    return dateStr;
  }
};

const WORKING_TYPES = ['Full Day', 'First Half', 'Second Half', 'Work From Home', 'On Duty'];

const DEFAULT_APP_LEAVE_TYPES: LeaveType[] = [
  { id: '502', label: 'Annual Leave', icon: 'ribbon-outline' },
  { id: '504', label: 'Paid Holiday', icon: 'calendar-outline' },
  { id: '505', label: 'Sick Leave', icon: 'medkit-outline' },
  { id: '506', label: 'Paid Casual Leave', icon: 'sunny-outline' },
  { id: '507', label: 'Unpaid Casual Leave', icon: 'wallet-outline' },
  { id: '508', label: 'Unpaid Leave', icon: 'wallet-outline' },
  { id: '509', label: 'Absent', icon: 'close-circle-outline' },
  { id: '510', label: 'Rest Day', icon: 'bed-outline' },
  { id: '512', label: 'Maternity Leave', icon: 'heart-outline' },
  { id: '513', label: 'Paternity Leave', icon: 'heart-outline' },
  { id: '518', label: 'Paid Leave', icon: 'wallet-outline' },
];

const ApplyLeaveScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  // 1. ERP Metadata State
  const [requestNo, setRequestNo] = useState('CE/26-27/LR0012');
  const [requestDate, setRequestDate] = useState('05-Jun-2026');
  const [employeeName, setEmployeeName] = useState('SUPERVISOR');
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Leave Types Dynamic State
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>(DEFAULT_APP_LEAVE_TYPES);
  const [employeeGender, setEmployeeGender] = useState<'Male' | 'Female' | null>(null);
  const [leaveHistory, setLeaveHistory] = useState<LeaveRequest[]>([]);
  const [leaveTypeId, setLeaveTypeId] = useState('502');

  // 2. Form Fields State
  const [startDate, setStartDate] = useState(toDateInput(new Date()));
  const [endDate, setEndDate] = useState(toDateInput(getTomorrowDate()));
  const [hasSelectedDates, setHasSelectedDates] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [startWorkingType, setStartWorkingType] = useState('Full Day');
  const [endWorkingType, setEndWorkingType] = useState('Full Day');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [attachmentUploaded, setAttachmentUploaded] = useState(false);
  const [attachmentUri, setAttachmentUri] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

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
  }, [calendarTarget, startDate, endDate]);

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

  // Picker States
  const [isLeaveTypePickerOpen, setIsLeaveTypePickerOpen] = useState(false);
  const [rangeItemPickerIndex, setRangeItemPickerIndex] = useState<number | null>(null);
  const [isRangeLeaveTypePickerOpen, setIsRangeLeaveTypePickerOpen] = useState(false);
  const [isRangeWorkingTypePickerOpen, setIsRangeWorkingTypePickerOpen] = useState(false);

  // Draft List & Editing state
  const [draftList, setDraftList] = useState<DraftItem[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  // Loading / Action Statuses
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ERP Leave Balances
  const [leaveBalances, setLeaveBalances] = useState<LeaveType[]>([
    { id: 'annual', label: 'Annual Leave', icon: 'ribbon-outline', remaining: 0, total: 0 },
    { id: 'paid-holiday', label: 'Paid Holiday', icon: 'calendar-outline', remaining: 0, total: 0 },
    { id: 'sick', label: 'Sick Leave', icon: 'medkit-outline', remaining: 0, total: 0 },
    { id: 'paid-casual', label: 'Paid Casual Leave', icon: 'sunny-outline', remaining: 0, total: 0 },
    { id: 'unpaid-casual', label: 'Unpaid Casual Leave', icon: 'wallet-outline', remaining: 0, total: 0 },
  ]);

  const visibleLeaveTypes = useMemo(() => {
    return leaveTypes.filter(type => {
      const labelLower = type.label.toLowerCase();
      if (labelLower.includes('maternity') && employeeGender && employeeGender !== 'Female') {
        return false;
      }
      if (labelLower.includes('paternity') && employeeGender && employeeGender !== 'Male') {
        return false;
      }
      
      // Filter out types that do not have a balance remaining > 0, if balance metadata is loaded
      if (leaveBalances && leaveBalances.length > 0) {
        const balItem = leaveBalances.find(b => {
          const bLabel = b.label.toLowerCase();
          const tLabel = type.label.toLowerCase();
          if (bLabel === tLabel) return true;
          if (b.id === type.id) return true;
          if (type.id === '502' && b.id === 'annual') return true;
          if (type.id === '504' && b.id === 'paid-holiday') return true;
          if (type.id === '505' && b.id === 'sick') return true;
          if (type.id === '506' && b.id === 'paid-casual') return true;
          if (type.id === '507' && b.id === 'unpaid-casual') return true;
          if (type.id === '518' && b.id === '518') return true;
          return false;
        });
        
        if (balItem) {
          return (balItem.remaining ?? 0) > 0;
        }
        return true;
      }
      return true;
    });
  }, [leaveTypes, employeeGender, leaveBalances]);

  useEffect(() => {
    if (visibleLeaveTypes.length > 0) {
      const isValid = visibleLeaveTypes.some(t => t.id === leaveTypeId);
      if (!isValid) {
        setLeaveTypeId(visibleLeaveTypes[0].id);
      }
    }
  }, [visibleLeaveTypes, leaveTypeId]);

  // Init metadata and balances
  useEffect(() => {
    const initData = async () => {
      try {
        const profile = await getEmployeeProfile();
        if (profile) {
          setEmployeeName(profile.userName || 'Employee');
          setProfileImage(profile.profileImageUrl || null);
          if (profile.gender) {
            setEmployeeGender(profile.gender as any);
          }
        }
      } catch (e) {
        try {
          const session = await getAuthSession();
          if (session?.user?.UserName) {
            setEmployeeName(session.user.UserName);
            setProfileImage(session.user.ProfileImage || null);
          }
        } catch (err) {
          console.warn('Failed to load session details', err);
        }
      } finally {
        setIsProfileLoading(false);
      }

      try {
        const fetchedBalances = await getLeaveBalances();
        setLeaveBalances(fetchedBalances);
      } catch (e) {
        console.warn('Failed to load leave balances', e);
      }

      try {
        const fetchedTypes = await getLeaveTypes();
        if (fetchedTypes && fetchedTypes.length > 0) {
          setLeaveTypes(fetchedTypes);
          setLeaveTypeId(fetchedTypes[0]?.id || '502');
        }
      } catch (e) {
        console.warn('Failed to load leave types', e);
      }

      try {
        const history = await getLeaveHistory();
        setLeaveHistory(history);
      } catch (e) {
        console.warn('Failed to load leave history', e);
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

  // Checklist of Days in range
  const [rangeDates, setRangeDates] = useState<RangeDateItem[]>([]);

  // Sync start and end working types for single day leave
  useEffect(() => {
    if (startDate === endDate) {
      if (startWorkingType !== endWorkingType) {
        setEndWorkingType(startWorkingType);
      }
    }
  }, [startWorkingType, startDate, endDate]);

  useEffect(() => {
    if (startDate === endDate) {
      if (endWorkingType !== startWorkingType) {
        setStartWorkingType(endWorkingType);
      }
    }
  }, [endWorkingType, startDate, endDate]);

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
      const totalDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      let idx = 0;
      while (current <= end) {
        const dateStr = toDateInput(current);
        const existing = prev.find(item => item.dateStr === dateStr);
        if (existing) {
          items.push(existing);
        } else {
          let defaultType = 'Full Day';
          if (idx === 0) {
            defaultType = startWorkingType;
          } else if (idx === totalDays - 1) {
            defaultType = endWorkingType;
          }
          items.push({
            dateStr,
            isSelected: true,
            workingType: defaultType,
            leaveTypeId: leaveTypeId,
          });
        }
        current.setDate(current.getDate() + 1);
        idx++;
      }
      return items;
    });
  }, [startDate, endDate]);

  // Update first and last day working types in the checklist when startWorkingType/endWorkingType changes
  useEffect(() => {
    setRangeDates(prev => {
      if (prev.length === 0) return prev;
      return prev.map((item, index) => {
        if (index === 0) {
          return { ...item, workingType: startWorkingType };
        }
        if (index === prev.length - 1) {
          return { ...item, workingType: endWorkingType };
        }
        return item;
      });
    });
  }, [startWorkingType, endWorkingType]);

  // Sync leave type change to all days in range
  useEffect(() => {
    setRangeDates(prev => prev.map(item => ({ ...item, leaveTypeId })));
  }, [leaveTypeId]);

  const selectedLeaveType = useMemo(
    () => visibleLeaveTypes.find(type => type.id === leaveTypeId) ?? visibleLeaveTypes[0] ?? DEFAULT_APP_LEAVE_TYPES[0],
    [leaveTypeId, visibleLeaveTypes],
  );

  // Active form days count
  const activeFormDays = useMemo(() => {
    if (!hasSelectedDates) return 0;
    return rangeDates
      .filter(item => item.isSelected)
      .reduce((sum, item) => {
        if (item.workingType === 'First Half' || item.workingType === 'Second Half') {
          return sum + 0.5;
        }
        return sum + 1.0;
      }, 0);
  }, [rangeDates, hasSelectedDates]);

  // Total Sick Leave days selected (form + drafts)
  const totalSickLeaveDays = useMemo(() => {
    let count = 0;
    if (selectedLeaveType?.label && selectedLeaveType.label.toLowerCase().includes('sick')) {
      count += activeFormDays;
    }
    draftList.forEach(draft => {
      if (draft.leaveTypeLabel.toLowerCase().includes('sick')) {
        if (draft.rangeDates && draft.rangeDates.length > 0) {
          const checked = draft.rangeDates.filter(d => d.isSelected);
          checked.forEach(d => {
            count += (d.workingType === 'First Half' || d.workingType === 'Second Half') ? 0.5 : 1.0;
          });
        } else {
          count += (draft.workingType === 'First Half' || draft.workingType === 'Second Half') ? 0.5 : 1.0;
        }
      }
    });
    return count;
  }, [selectedLeaveType, activeFormDays, draftList]);

  const handleToggleRangeDate = (index: number) => {
    setRangeDates(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        isSelected: !copy[index].isSelected,
      };

      const selectedItems = copy.filter(item => item.isSelected);
      if (selectedItems.length === 0) {
        Alert.alert('Selection Error', 'At least one date must be selected.');
        return prev;
      }

      // Sort and update start/end date fields dynamically
      const sorted = [...selectedItems].sort((a, b) => a.dateStr.localeCompare(b.dateStr));
      const firstSelected = sorted[0].dateStr;
      const lastSelected = sorted[sorted.length - 1].dateStr;

      if (firstSelected !== startDate) {
        setStartDate(firstSelected);
      }
      if (lastSelected !== endDate) {
        setEndDate(lastSelected);
      }

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
    setLeaveTypeId(leaveTypes[0]?.id || '502');
    setStartWorkingType('Full Day');
    setEndWorkingType('Full Day');
    setReason('');
    setRemarks('');
    setEditingDraftId(null);
    setErrorMessage(null);
    setRangeDates([]);
    setHasSelectedDates(false);
  };

  const RESTRICTED_LEAVE_LABELS = ['Annual Leave', 'Paid Holiday', 'Paid Casual Leave'];

  // Helper to validate leave balances
  const validateLeaveBalances = (
    targetLeaveTypeId: string,
    additionalDays: number,
    excludeDraftId: string | null = null
  ) => {
    const selectedLabel = visibleLeaveTypes.find(t => t.id === targetLeaveTypeId)?.label || selectedLeaveType.label;
    const balanceItem = leaveBalances.find(b => b.id === targetLeaveTypeId || b.label === selectedLabel);
    if (!balanceItem) return { isValid: true };

    const remaining = balanceItem.remaining ?? 0;

    // Sum the days already applied in OTHER drafts
    let existingDays = 0;
    draftList.forEach(draft => {
      if (draft.id === excludeDraftId) return;

      const isMatch = draft.leaveTypeId === targetLeaveTypeId || draft.leaveTypeLabel === balanceItem.label;
      if (isMatch) {
        existingDays += draft.days;
      }
    });

    const totalProposed = existingDays + additionalDays;

    if (remaining <= 0) {
      return {
        isValid: false,
        message: `You have 0 days remaining for ${balanceItem.label}.`,
      };
    }

    if (totalProposed > remaining) {
      return {
        isValid: false,
        message: `Requested ${totalProposed} days of ${balanceItem.label}, but you only have ${remaining} days remaining.`,
      };
    }

    return { isValid: true };
  };

  // Helper to check shift-level conflicts
  const isShiftConflicting = (shift1: string, shift2: string): boolean => {
    const s1 = shift1.toLowerCase();
    const s2 = shift2.toLowerCase();
    if (s1.includes('full') || s2.includes('full')) return true;
    if (s1.includes('half') || s2.includes('half')) return true;
    if (s1.includes('first') && s2.includes('first')) return true;
    if (s1.includes('second') && s2.includes('second')) return true;
    return false;
  };

  // Helper to check for conflicting leave dates in drafts and server history
  const checkConflictingDates = (
    targetRangeDates: RangeDateItem[],
    excludeDraftId: string | null = null
  ) => {
    const selectedTargetDates = targetRangeDates.filter(d => d.isSelected);

    // 1. Check against other drafts in the list
    for (const draft of draftList) {
      if (draft.id === excludeDraftId) continue;

      if (draft.rangeDates) {
        const checked = draft.rangeDates.filter(d => d.isSelected);
        for (const target of selectedTargetDates) {
          const match = checked.find(d => d.dateStr === target.dateStr);
          if (match && isShiftConflicting(match.workingType, target.workingType)) {
            return {
              hasConflict: true,
              message: `Shift conflict on ${formatDateInput(target.dateStr)}: Already selected as ${match.workingType} in draft item.`,
            };
          }
        }
      } else {
        const start = new Date(`${draft.startDate}T00:00:00`);
        const end = new Date(`${draft.endDate}T00:00:00`);
        const current = new Date(start);
        while (current <= end) {
          const dStr = toDateInput(current);
          const target = selectedTargetDates.find(d => d.dateStr === dStr);
          if (target && isShiftConflicting(draft.workingType || 'Full Day', target.workingType)) {
            return {
              hasConflict: true,
              message: `Shift conflict on ${formatDateInput(dStr)}: Already selected as ${draft.workingType || 'Full Day'} in draft item.`,
            };
          }
          current.setDate(current.getDate() + 1);
        }
      }
    }

    // 2. Check against leave history fetched from database (pending or approved requests)
    for (const item of leaveHistory) {
      if (item.status !== 'Pending' && item.status !== 'Approved') continue;

      const start = new Date(`${item.startDate}T00:00:00`);
      const end = new Date(`${item.endDate}T00:00:00`);
      const current = new Date(start);
      while (current <= end) {
        const dStr = toDateInput(current);
        const target = selectedTargetDates.find(d => d.dateStr === dStr);
        if (target && isShiftConflicting(item.isHalfDay ? 'Half Day' : 'Full Day', target.workingType)) {
          return {
            hasConflict: true,
            message: `Date ${formatDateInput(dStr)} already has a pending/approved leave request: ${item.leaveType}.`,
          };
        }
        current.setDate(current.getDate() + 1);
      }
    }

    return { hasConflict: false };
  };

  const handleSaveDraft = () => {
    setErrorMessage(null);
    const trimmedReason = reason.trim();
    if (!hasSelectedDates || !startDate || !endDate) {
      setErrorMessage('Please select start and end dates before adding range.');
      return;
    }
    if (new Date(`${endDate}T00:00:00`) < new Date(`${startDate}T00:00:00`)) {
      setErrorMessage('End date cannot be before start date.');
      return;
    }
    if (trimmedReason.length < 5) {
      setErrorMessage('Reason for leave is required (at least 5 characters).');
      return;
    }

    // Role-based restrictions check
    const isRestrictedCategory = RESTRICTED_LEAVE_LABELS.includes(selectedLeaveType.label);
    const startsToday = startDate === toDateInput(new Date());
    const isRegularEmployee = !employeeName.toLowerCase().includes('supervisor') && !employeeName.toLowerCase().includes('manager');

    if (isRegularEmployee && isRestrictedCategory && startsToday) {
      setErrorMessage(`You do not have permission to apply for ${selectedLeaveType.label} starting on the current date. Please plan in advance.`);
      return;
    }

    // Balance check
    const balanceCheck = validateLeaveBalances(leaveTypeId, activeFormDays, editingDraftId);
    if (!balanceCheck.isValid) {
      setErrorMessage(balanceCheck.message || 'Validation error');
      return;
    }

    // Overlap check
    const overlapCheck = checkConflictingDates(rangeDates, editingDraftId);
    if (overlapCheck.hasConflict) {
      setErrorMessage(overlapCheck.message || 'Overlap conflict');
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
            workingType: startWorkingType,
            startDate,
            endDate,
            days: activeFormDays,
            reason: trimmedReason,
            remarks: remarks.trim(),
            rangeDates: rangeDates,
            attachmentUri,
            attachmentName,
          };
        }
        return item;
      }));
      Toast.show({
        type: 'success',
        text1: 'Date range updated',
        text2: 'The selected date range has been updated.',
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
        workingType: startWorkingType,
        startDate,
        endDate,
        days: activeFormDays,
        reason: trimmedReason,
        remarks: remarks.trim(),
        rangeDates: rangeDates,
        attachmentUri,
        attachmentName,
      };
      setDraftList(prev => [...prev, newDraft]);
      Toast.show({
        type: 'success',
        text1: 'Date range added',
        text2: 'The item has been added as a draft request.',
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
    setStartDate(item.startDate);
    setEndDate(item.endDate);
    setReason(item.reason);
    setRemarks(item.remarks);
    setHasSelectedDates(true);
    setAttachmentUploaded(!!item.attachmentUri);
    setAttachmentUri(item.attachmentUri ?? null);
    setAttachmentName(item.attachmentName ?? null);
    if (item.rangeDates) {
      setRangeDates(item.rangeDates);
      if (item.rangeDates.length > 0) {
        setStartWorkingType(item.rangeDates[0].workingType);
        setEndWorkingType(item.rangeDates[item.rangeDates.length - 1].workingType);
      }
    } else {
      setStartWorkingType(item.workingType);
      setEndWorkingType(item.workingType);
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
      text2: 'The date range draft has been removed.',
      position: 'top',
      topOffset: 60,
    });
  };

  interface LeaveRequestDetail {
    lr_date: string;
    lr_day: string;
    type: string;
    typ_id: string;
  }

  interface GroupedLeaveRequest {
    leaveType: string;
    startDate: string;
    endDate: string;
    reason: string;
    isHalfDay: boolean;
    attachment_path?: string;
    details: LeaveRequestDetail[];
  }

  const getLeaveTypeId = (leaveType: string): string => {
    const typeMap: Record<string, string> = {
      'Annual Leave': '502',
      'Paid Holiday': '504',
      'Sick Leave': '505',
      'Paid Casual Leave': '506',
      'Unpaid Casual Leave': '507',
      'Unpaid Leave': '508',
      'Absent': '509',
      'Rest Day': '510',
      'Maternity Leave': '512',
      'Paid Leave': '518',
    };
    return typeMap[leaveType] || '502';
  };

  const groupDatesToRequests = (
    dates: RangeDateItem[],
    reasonText: string,
    remarksText: string,
    attachmentPath?: string
  ): GroupedLeaveRequest[] => {
    const checked = dates.filter(d => d.isSelected);
    if (checked.length === 0) return [];

    // Sort chronologically
    const sorted = [...checked].sort(
      (a, b) => new Date(a.dateStr).getTime() - new Date(b.dateStr).getTime()
    );

    const groups: GroupedLeaveRequest[] = [];
    let currentGroup: GroupedLeaveRequest | null = null;

    for (const item of sorted) {
      const typeLabel = visibleLeaveTypes.find(t => t.id === item.leaveTypeId)?.label || selectedLeaveType.label;
      const itemDate = new Date(`${item.dateStr}T00:00:00`);

      let isContiguous = false;
      if (currentGroup) {
        const lastDetailDate = new Date(`${currentGroup.details[currentGroup.details.length - 1].lr_date}T00:00:00`);
        const diffTime = itemDate.getTime() - lastDetailDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 1 && currentGroup.leaveType === typeLabel) {
          isContiguous = true;
        }
      }

      const detailItem: LeaveRequestDetail = {
        lr_date: item.dateStr,
        lr_day: item.workingType,
        type: typeLabel,
        typ_id: getLeaveTypeId(typeLabel),
      };

      if (isContiguous && currentGroup) {
        currentGroup.details.push(detailItem);
        currentGroup.endDate = item.dateStr;
        if (item.workingType === 'Full Day') {
          currentGroup.isHalfDay = false;
        }
      } else {
        const finalReason = remarksText.trim()
          ? `${reasonText} (Remarks: ${remarksText.trim()})`
          : reasonText;

        currentGroup = {
          leaveType: typeLabel,
          startDate: item.dateStr,
          endDate: item.dateStr,
          reason: finalReason,
          isHalfDay: item.workingType === 'First Half' || item.workingType === 'Second Half',
          attachment_path: attachmentPath || undefined,
          details: [detailItem],
        };
        groups.push(currentGroup);
      }
    }

    return groups;
  };

  const handleSubmit = async () => {
    setErrorMessage(null);
    const trimmedReason = reason.trim();

    // Determine final drafts to submit
    let finalDraftList = [...draftList];

    // If user is editing a draft, auto-save/merge the active form values into that draft item first!
    if (editingDraftId !== null) {
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

      // Balance and overlap check (excluding the current draft)
      const balanceCheck = validateLeaveBalances(leaveTypeId, activeFormDays, editingDraftId);
      if (!balanceCheck.isValid) {
        setErrorMessage(balanceCheck.message || 'Validation error');
        return;
      }
      const overlapCheck = checkConflictingDates(rangeDates, editingDraftId);
      if (overlapCheck.hasConflict) {
        setErrorMessage(overlapCheck.message || 'Overlap conflict');
        return;
      }

      // Merge current form fields into the draft list
      finalDraftList = finalDraftList.map(item => {
        if (item.id === editingDraftId) {
          return {
            ...item,
            employeeName,
            leaveTypeLabel: selectedLeaveType.label,
            leaveTypeId,
            workingType: startWorkingType,
            startDate,
            endDate,
            days: activeFormDays,
            reason: trimmedReason,
            remarks: remarks.trim(),
            rangeDates: rangeDates,
            attachmentUri,
            attachmentName,
          };
        }
        return item;
      });
    }

    // Construct the list of items to submit
    const itemsToSubmit: GroupedLeaveRequest[] = [];

    // Add active form if NOT editing a draft, and if it's filled
    const isActiveFormFilled = trimmedReason || startDate !== toDateInput(new Date());
    if (editingDraftId === null && isActiveFormFilled) {
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

      // Check if attachment is required for active form sick leave of more than 1 day
      const mainIsSick = selectedLeaveType?.label && selectedLeaveType.label.toLowerCase().includes('sick');
      if (mainIsSick && activeFormDays > 1.0 && !attachmentUri) {
        setErrorMessage('Attachment is compulsory for Sick Leave of more than 1 day. Please upload a document.');
        return;
      }

      // Role-based restrictions check
      const isRestrictedCategory = RESTRICTED_LEAVE_LABELS.includes(selectedLeaveType.label);
      const startsToday = startDate === toDateInput(new Date());
      const isRegularEmployee = !employeeName.toLowerCase().includes('supervisor') && !employeeName.toLowerCase().includes('manager');

      if (isRegularEmployee && isRestrictedCategory && startsToday) {
        setErrorMessage(`You do not have permission to apply for ${selectedLeaveType.label} starting on the current date. Please plan in advance.`);
        return;
      }

      const checkedDates = rangeDates.filter(d => d.isSelected);
      if (checkedDates.length === 0) {
        setErrorMessage('No days are selected in the date checklist.');
        return;
      }
    }

    // Check if attachment is required for any draft sick leave of more than 1 day
    for (const draft of finalDraftList) {
      const draftIsSick = draft.leaveTypeLabel.toLowerCase().includes('sick');
      if (draftIsSick && draft.days > 1.0 && !draft.attachmentUri) {
        setErrorMessage(`Attachment is compulsory for Sick Leave range (${formatDateInput(draft.startDate)} to ${formatDateInput(draft.endDate)}).`);
        return;
      }
    }

    // 1. Group active form dates if active form is submitted
    if (editingDraftId === null && isActiveFormFilled) {
      const activeGroups = groupDatesToRequests(rangeDates, trimmedReason, remarks, attachmentUri || undefined);
      itemsToSubmit.push(...activeGroups);
    }

    // 2. Group draft list dates
    finalDraftList.forEach(draft => {
      if (draft.rangeDates && draft.rangeDates.length > 0) {
        const draftGroups = groupDatesToRequests(draft.rangeDates, draft.reason, draft.remarks, draft.attachmentUri || undefined);
        itemsToSubmit.push(...draftGroups);
      } else {
        // Fallback for draft with no rangeDates
        const typeLabel = draft.leaveTypeLabel;
        const detailItem: LeaveRequestDetail = {
          lr_date: draft.startDate,
          lr_day: draft.workingType || 'Full Day',
          type: typeLabel,
          typ_id: getLeaveTypeId(typeLabel),
        };
        const finalReason = draft.remarks
          ? `${draft.reason} (Remarks: ${draft.remarks})`
          : draft.reason;

        itemsToSubmit.push({
          leaveType: typeLabel,
          startDate: draft.startDate,
          endDate: draft.endDate,
          reason: finalReason,
          isHalfDay: draft.workingType === 'First Half' || draft.workingType === 'Second Half',
          attachment_path: draft.attachmentUri || undefined,
          details: [detailItem],
        });
      }
    });

    if (itemsToSubmit.length === 0) {
      setErrorMessage('Please fill in the leave form and reason before submitting.');
      return;
    }

    // 3. Global Balance Check
    const proposedBalances = new Map<string, number>();
    for (const req of itemsToSubmit) {
      const current = proposedBalances.get(req.leaveType) ?? 0;
      const daysCount = req.details.reduce((sum, d) => sum + ((d.lr_day === 'First Half' || d.lr_day === 'Second Half') ? 0.5 : 1.0), 0);
      proposedBalances.set(req.leaveType, current + daysCount);
    }

    for (const [label, proposedDays] of proposedBalances.entries()) {
      const balanceItem = leaveBalances.find(b => b.label.toLowerCase() === label.toLowerCase());
      if (balanceItem) {
        const remaining = balanceItem.remaining ?? 0;
        if (remaining <= 0) {
          setErrorMessage(`You have 0 days remaining for ${balanceItem.label}.`);
          return;
        }
        if (proposedDays > remaining) {
          setErrorMessage(`Requested ${proposedDays} days of ${balanceItem.label}, but you only have ${remaining} days remaining.`);
          return;
        }
      }
    }

    // 4. Global Overlap Check
    const historyShifts = new Map<string, string>();
    for (const item of leaveHistory) {
      if (item.status === 'Cancelled' || item.status === 'Rejected') continue;
      const start = new Date(`${item.startDate}T00:00:00`);
      const end = new Date(`${item.endDate}T00:00:00`);
      const current = new Date(start);
      while (current <= end) {
        historyShifts.set(toDateInput(current), item.isHalfDay ? 'Half Day' : 'Full Day');
        current.setDate(current.getDate() + 1);
      }
    }

    const submittedShifts = new Map<string, string>();
    for (const req of itemsToSubmit) {
      for (const d of req.details) {
        const dStr = d.lr_date;
        const shiftType = d.lr_day;

        if (historyShifts.has(dStr)) {
          const histShift = historyShifts.get(dStr)!;
          if (isShiftConflicting(histShift, shiftType)) {
            setErrorMessage(`Conflict on ${formatDateInput(dStr)}: Already has a pending/approved leave request.`);
            return;
          }
        }

        if (submittedShifts.has(dStr)) {
          const subShift = submittedShifts.get(dStr)!;
          if (isShiftConflicting(subShift, shiftType)) {
            setErrorMessage(`Duplicate date selection: Shift conflict on ${formatDateInput(dStr)} within this request.`);
            return;
          }
        }
        submittedShifts.set(dStr, shiftType);
      }
    }

    setIsSubmitting(true);

    try {
      // 5. Upload files first if local files are selected
      let activeUploadedPath = attachmentUri;
      if (editingDraftId === null && attachmentUri && (attachmentUri.startsWith('file://') || attachmentUri.startsWith('content://'))) {
        const path = await uploadLeaveAttachment(attachmentUri, attachmentName || 'attachment.jpg');
        activeUploadedPath = path;
      }

      for (const req of itemsToSubmit) {
        if (req.attachment_path && (req.attachment_path.startsWith('file://') || req.attachment_path.startsWith('content://'))) {
          if (req.attachment_path === attachmentUri) {
            req.attachment_path = activeUploadedPath || undefined;
          } else {
            const filename = req.attachment_path.split('/').pop() || 'attachment.jpg';
            const path = await uploadLeaveAttachment(req.attachment_path, filename);
            req.attachment_path = path;
          }
        }
      }

      // 6. Submit leave requests sequentially
      for (const item of itemsToSubmit) {
        await applyForLeave(item);
      }

      Toast.show({
        type: 'success',
        text1: 'Leave request(s) submitted',
        text2: `Successfully submitted ${itemsToSubmit.length} request(s).`,
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

  const userInitials = useMemo(() => {
    if (!employeeName) return 'EM';
    const parts = employeeName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return employeeName.slice(0, 2).toUpperCase();
  }, [employeeName]);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Permission to access gallery is required to select images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setAttachmentUploaded(true);
        const filename = asset.uri.split('/').pop() || 'image.jpg';
        setAttachmentUri(asset.uri);
        setAttachmentName(filename);
        Alert.alert('Attachment', `Image "${filename}" selected successfully.`);
      }
    } catch (err) {
      console.error('Error picking image:', err);
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setAttachmentUploaded(true);
        setAttachmentUri(result.assets[0].uri);
        setAttachmentName(result.assets[0].name);
        Alert.alert('Attachment', `Document "${result.assets[0].name}" selected successfully.`);
      } else if ((result as any).type === 'success') {
        setAttachmentUploaded(true);
        setAttachmentUri((result as any).uri);
        setAttachmentName((result as any).name || 'document');
        Alert.alert('Attachment', `Document "${(result as any).name || 'document'}" selected successfully.`);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Failed to pick document.');
    }
  };

  const handleAttachmentUpload = () => {
    Alert.alert(
      'Attach File',
      'Choose attachment source:',
      [
        {
          text: 'Camera Roll / Photo Gallery',
          onPress: handlePickImage,
        },
        {
          text: 'Document (PDF, Word, etc.)',
          onPress: handlePickDocument,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Custom AppBar */}
      <AppBar title="Apply for Leave" showBackButton onBackPress={() => navigation.goBack()} />

      <LinearGradient
        colors={['#FFF5F2', '#F8FAFC']}
        style={styles.gradientBg}
      >
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.content, { paddingBottom: moderateScale(40) + insets.bottom }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* Leave Balances Horizontal Preview Cards */}
            {/* Leave Balances Horizontal Preview Cards */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.balancesPreviewRow}
              style={{ marginBottom: moderateScale(4) }}
            >
              {leaveBalances.map(type => {
                const remaining = type.remaining ?? 0;
                const total = type.total ?? 0;
                const progress = total > 0 ? Math.min(1, Math.max(0, remaining / total)) : 0;
                const progressPercent = `${Math.round(progress * 100)}%`;

                const cardConfig = (() => {
                  const labelLower = type.label.toLowerCase();
                  if (labelLower.includes('annual') || labelLower.includes('earned')) {
                    return {
                      color: '#FF4D1C',
                      icon: 'airplane-outline' as const,
                    };
                  }
                  if (labelLower.includes('sick')) {
                    return {
                      color: '#3B82F6',
                      icon: 'medkit-outline' as const,
                    };
                  }
                  if (labelLower.includes('casual')) {
                    return {
                      color: '#10B981',
                      icon: 'sunny-outline' as const,
                    };
                  }
                  if (labelLower.includes('holiday')) {
                    return {
                      color: '#EC4899',
                      icon: 'calendar-outline' as const,
                    };
                  }
                  return {
                    color: '#6366F1',
                    icon: 'wallet-outline' as const,
                  };
                })();

                return (
                  <View key={type.id} style={styles.miniBalanceCard}>
                    <Text style={styles.miniCardLabel}>{type.label.toUpperCase()}</Text>
                    <Text style={[styles.miniCardValue, { color: cardConfig.color }]}>
                      {String(Math.round(remaining)).padStart(2, '0')}
                      <Text style={styles.miniCardDaysLabel}> DAYS</Text>
                    </Text>
                    <View style={styles.miniCardProgressBg}>
                      <View style={[styles.miniCardProgressFill, { backgroundColor: cardConfig.color, width: progressPercent as any }]} />
                    </View>
                    <Ionicons name={cardConfig.icon} size={moderateScale(40)} color={`${cardConfig.color}07`} style={styles.miniCardWatermark} />
                  </View>
                );
              })}
            </ScrollView>

            {/* Main Form Card Wrapper */}
            <View style={styles.mainFormCard}>
              {/* 1. Select Leave Type */}
              <View style={styles.fieldSection}>
                <View style={styles.fieldLabelRow}>
                  <Text style={styles.fieldLabel}>SELECT LEAVE TYPE</Text>
                  <TouchableOpacity
                    style={styles.calendarEditBtn}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (isProfileLoading) {
                        Toast.show({
                          type: 'info',
                          text1: 'Loading profile...',
                          text2: 'Please wait, checking gender restrictions.',
                        });
                        return;
                      }
                      setIsLeaveTypePickerOpen(true);
                    }}
                  >
                    <Ionicons name="calendar-outline" size={moderateScale(16)} color="#FF4D1C" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.dropdownSelector}
                  onPress={() => {
                    if (isProfileLoading) {
                      Toast.show({
                        type: 'info',
                        text1: 'Loading profile...',
                        text2: 'Please wait, checking gender restrictions.',
                      });
                      return;
                    }
                    setIsLeaveTypePickerOpen(true);
                  }}
                  activeOpacity={0.85}
                >
                  <View style={styles.dropdownLeft}>
                    <Ionicons name="shapes-outline" size={moderateScale(18)} color="#64748B" style={{ marginRight: 8 }} />
                    <Text style={styles.dropdownText}>{selectedLeaveType.label}</Text>
                  </View>
                  <Ionicons name="swap-vertical-outline" size={moderateScale(16)} color="#64748B" />
                </TouchableOpacity>
              </View>

              {/* 2. Dates Selection Box (Shaded Box) */}
              <View style={styles.datesSelectionBox}>
                <View style={styles.datesGridRow}>
                  {/* From Column */}
                  <View style={styles.dateCol}>
                    <Text style={styles.dateColLabel}>FROM</Text>
                    <TouchableOpacity
                      style={styles.dateInputButton}
                      onPress={() => handleOpenCalendar('start')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={moderateScale(18)} color="#64748B" style={{ marginRight: 6 }} />
                      <Text style={styles.dateInputText}>{hasSelectedDates ? formatDateInput(startDate) : 'mm/dd/yyyy'}</Text>
                      <Ionicons name="calendar-outline" size={moderateScale(14)} color="#E2E8F0" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                  </View>

                  {/* To Column */}
                  <View style={styles.dateCol}>
                    <Text style={styles.dateColLabel}>TO</Text>
                    <TouchableOpacity
                      style={styles.dateInputButton}
                      onPress={() => handleOpenCalendar('end')}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="calendar-outline" size={moderateScale(18)} color="#64748B" style={{ marginRight: 6 }} />
                      <Text style={styles.dateInputText}>{hasSelectedDates ? formatDateInput(endDate) : 'mm/dd/yyyy'}</Text>
                      <Ionicons name="calendar-outline" size={moderateScale(14)} color="#E2E8F0" style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* 3. Add Another Date Range Button */}
              <TouchableOpacity style={styles.addRangeButton} onPress={handleSaveDraft} activeOpacity={0.8}>
                <Ionicons
                  name={editingDraftId ? "checkmark-circle-outline" : "add-circle-outline"}
                  size={moderateScale(18)}
                  color="#FF4D1C"
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.addRangeButtonText}>
                  {editingDraftId ? 'Save Changes' : 'Add another date range'}
                </Text>
              </TouchableOpacity>

              {/* Checklist of selected range days */}
              {hasSelectedDates && (
                <View style={styles.checklistSection}>
                  <Text style={styles.checklistTitle}>Date Checklist ({activeFormDays} Days)</Text>

                  {/* Single day checklist */}
                  {rangeDates.length === 0 && (
                    <View style={styles.checkItemRow}>
                      <View style={styles.checkLeft}>
                        <View style={[styles.checkbox, styles.checkboxActive]}>
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                        <Text style={styles.checkDateText}>
                          {new Date(`${startDate}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.checkPillTrigger} onPress={() => setIsRangeWorkingTypePickerOpen(true)}>
                        <Text style={styles.checkPillText}>{startWorkingType}</Text>
                        <Ionicons name="chevron-down" size={8} color="#64748B" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Multiple days checklist */}
                  {rangeDates.length > 0 && rangeDates.map((item, idx) => (
                    <View key={item.dateStr} style={styles.checkItemRow}>
                      <TouchableOpacity style={styles.checkLeft} onPress={() => handleToggleRangeDate(idx)} activeOpacity={0.7}>
                        <View style={[styles.checkbox, item.isSelected && styles.checkboxActive]}>
                          {item.isSelected && <Ionicons name="checkmark" size={10} color="#FFFFFF" />}
                        </View>
                        <Text style={styles.checkDateText}>
                          {new Date(`${item.dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </Text>
                      </TouchableOpacity>
                      {item.isSelected && (
                        <TouchableOpacity style={styles.checkPillTrigger} onPress={() => handleOpenRangeWorkingTypePicker(idx)}>
                          <Text style={styles.checkPillText}>{item.workingType}</Text>
                          <Ionicons name="chevron-down" size={8} color="#64748B" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {/* 4. Reason Input */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>REASON FOR LEAVE</Text>
                <View style={styles.textInputBox}>
                  <Ionicons name="menu-outline" size={moderateScale(18)} color="#64748B" style={{ marginRight: 8, marginTop: Platform.OS === 'ios' ? 2 : 0 }} />
                  <TextInput
                    value={reason}
                    onChangeText={setReason}
                    placeholder="Briefly describe the purpose..."
                    placeholderTextColor="#94A3B8"
                    style={styles.textInput}
                    multiline={true}
                    numberOfLines={2}
                  />
                </View>
              </View>

              {/* 5. Attachment Upload */}
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>
                  ATTACHMENT {totalSickLeaveDays > 1.0 ? '(REQUIRED)' : '(OPTIONAL)'}
                </Text>
                <TouchableOpacity style={styles.uploadBox} onPress={handleAttachmentUpload} activeOpacity={0.8}>
                  <View style={styles.uploadIconBadge}>
                    <Ionicons name="document-attach-outline" size={moderateScale(24)} color="#FF4D1C" />
                  </View>
                  <Text style={styles.uploadBoxTitle}>
                    {attachmentUploaded ? 'Document uploaded' : 'Tap to upload documents'}
                  </Text>
                  <Text style={styles.uploadBoxSubtext}>PDF, JPG up to 5MB</Text>
                </TouchableOpacity>

                {attachmentUploaded && attachmentUri && (
                  <View style={styles.attachmentFileCard}>
                    <Ionicons name="document-text-outline" size={24} color="#FF4D1C" />
                    <View style={styles.attachmentFileInfo}>
                      <Text style={styles.attachmentFileName} numberOfLines={1}>
                        {attachmentName || 'attachment.jpg'}
                      </Text>
                      <Text style={styles.attachmentFileSize}>Tap to view file</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.attachmentViewBtn}
                      onPress={async () => {
                        if (attachmentUri) {
                          try {
                            const isAvailable = await Sharing.isAvailableAsync();
                            if (isAvailable) {
                              await Sharing.shareAsync(attachmentUri);
                            } else {
                              await Linking.openURL(attachmentUri);
                            }
                          } catch (err) {
                            Alert.alert('Attachment', `Attached file: ${attachmentName}`);
                            console.warn('Error sharing attachment:', err);
                          }
                        }
                      }}
                    >
                      <Ionicons name="eye-outline" size={20} color="#FF4D1C" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.attachmentRemoveBtn}
                      onPress={() => {
                        setAttachmentUploaded(false);
                        setAttachmentUri(null);
                        setAttachmentName(null);
                      }}
                    >
                      <Ionicons name="close-circle" size={20} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Error Message Box */}
              {errorMessage && (
                <View style={styles.formErrorBox}>
                  <Ionicons name="alert-circle-outline" size={16} color="#EF4444" style={{ marginRight: 6 }} />
                  <Text style={styles.formErrorText}>{errorMessage}</Text>
                </View>
              )}

              {/* 6. Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, editingDraftId !== null && { backgroundColor: '#CBD5E1' }]}
                onPress={() => {
                  if (editingDraftId !== null) {
                    Alert.alert('Unsaved Changes', 'Please save your date range changes first.');
                  } else {
                    handleSubmit();
                  }
                }}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <View style={styles.submitBtnContent}>
                    <Text style={styles.submitBtnText}>Submit Application</Text>
                    <Ionicons name="paper-plane-outline" size={moderateScale(16)} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </TouchableOpacity>

              <Text style={styles.submitSubtext}>Approval usually takes 1-2 business days.</Text>
            </View>

            {/* Draft Ranges List */}
            {draftList.length > 0 && (
              <View style={styles.draftSection}>
                <Text style={styles.draftSectionTitle}>Applied Ranges ({draftList.length})</Text>
                {draftList.map(item => (
                  <View key={item.id} style={styles.draftItemCard}>
                    <View style={styles.draftItemHeader}>
                      <Text style={styles.draftItemType}>{item.leaveTypeLabel}</Text>
                      <Text style={styles.draftItemDays}>{item.days} Day{item.days === 1 ? '' : 's'}</Text>
                    </View>
                    <Text style={styles.draftItemPeriod}>
                      Period: {formatDateInput(item.startDate)} → {formatDateInput(item.endDate)}
                    </Text>
                    <View style={styles.draftItemFooter}>
                      <TouchableOpacity style={styles.draftActionLink} onPress={() => handleEditDraft(item)}>
                        <Ionicons name="pencil-outline" size={12} color="#3B82F6" style={{ marginRight: 4 }} />
                        <Text style={[styles.draftActionLinkText, { color: '#3B82F6' }]}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.draftActionLink} onPress={() => handleDeleteDraft(item.id)}>
                        <Ionicons name="trash-outline" size={12} color="#EF4444" style={{ marginRight: 4 }} />
                        <Text style={[styles.draftActionLinkText, { color: '#EF4444' }]}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>

      {/* Selectors Modals */}
      {/* A. Leave Type Modal */}
      <Modal visible={isLeaveTypePickerOpen} transparent={true} animationType="fade" onRequestClose={() => setIsLeaveTypePickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsLeaveTypePickerOpen(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Leave Type</Text>
            <ScrollView>
              {visibleLeaveTypes.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setLeaveTypeId(type.id);
                    setIsLeaveTypePickerOpen(false);
                  }}
                >
                  <Text style={[styles.modalItemText, leaveTypeId === type.id && styles.modalItemTextActive]}>{type.label}</Text>
                  {leaveTypeId === type.id && <Ionicons name="checkmark" size={18} color="#FF4D1C" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* B. Range Item Working Type Modal */}
      <Modal visible={isRangeWorkingTypePickerOpen} transparent={true} animationType="fade" onRequestClose={() => setIsRangeWorkingTypePickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsRangeWorkingTypePickerOpen(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Working Type</Text>
            <ScrollView>
              {rangeItemPickerIndex !== null && ['Full Day', 'First Half', 'Second Half'].map(wt => (
                <TouchableOpacity
                  key={wt}
                  style={styles.modalItem}
                  onPress={() => handleSelectRangeWorkingType(wt)}
                >
                  <Text style={[styles.modalItemText, rangeDates[rangeItemPickerIndex]?.workingType === wt && styles.modalItemTextActive]}>{wt}</Text>
                  {rangeDates[rangeItemPickerIndex]?.workingType === wt && <Ionicons name="checkmark" size={18} color="#FF4D1C" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* C. Range Item Leave Type Modal */}
      <Modal visible={isRangeLeaveTypePickerOpen} transparent={true} animationType="fade" onRequestClose={() => setIsRangeLeaveTypePickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsRangeLeaveTypePickerOpen(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Leave Type</Text>
            <ScrollView>
              {rangeItemPickerIndex !== null && visibleLeaveTypes.map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={styles.modalItem}
                  onPress={() => handleSelectRangeLeaveType(type.id)}
                >
                  <Text style={[styles.modalItemText, rangeDates[rangeItemPickerIndex]?.leaveTypeId === type.id && styles.modalItemTextActive]}>{type.label}</Text>
                  {rangeDates[rangeItemPickerIndex]?.leaveTypeId === type.id && <Ionicons name="checkmark" size={18} color="#FF4D1C" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Custom Calendar Picker Modal */}
      <Modal visible={isCalendarOpen} transparent={true} animationType="fade" onRequestClose={() => setIsCalendarOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsCalendarOpen(false)}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>Select {calendarTarget === 'start' ? 'Start' : 'End'} Date</Text>
            <View style={styles.calendarContainer}>
              <View style={styles.calendarHeaderRow}>
                <TouchableOpacity onPress={handlePrevMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-back" size={20} color="#0F172A" />
                </TouchableOpacity>
                <Text style={styles.calendarMonthYearText}>
                  {CALENDAR_MONTHS[currentCalendarMonth]} {currentCalendarYear}
                </Text>
                <TouchableOpacity onPress={handleNextMonth} style={styles.monthNavBtn}>
                  <Ionicons name="chevron-forward" size={20} color="#0F172A" />
                </TouchableOpacity>
              </View>
              <View style={styles.weekdaysRow}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(dayName => (
                  <Text key={dayName} style={styles.weekdayText}>{dayName}</Text>
                ))}
              </View>
              <View style={styles.daysGrid}>
                {calendarDaysGrid.map((dayObj, gridIdx) => {
                  const isSelected = dayObj.dateString === (calendarTarget === 'start' ? startDate : endDate);
                  const isCurrentMonth = dayObj.month === currentCalendarMonth;
                  const isToday = dayObj.isToday;

                  // Check if date is in the past
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const cellDate = dayObj.dateString ? new Date(`${dayObj.dateString}T00:00:00`) : null;
                  const isPastDate = cellDate ? cellDate < today : false;

                  return (
                    <TouchableOpacity
                      key={gridIdx}
                      style={[
                        styles.dayCell,
                        isSelected && styles.dayCellSelected,
                        !isCurrentMonth && styles.dayCellInactive,
                        isPastDate && styles.dayCellInactive,
                      ]}
                      onPress={() => dayObj.dateString && handleSelectDate(dayObj.dateString)}
                      disabled={!dayObj.dateString || isPastDate}
                    >
                      {isSelected ? (
                        <View style={styles.daySelectedDot}>
                          <Text style={styles.dayCellTextSelected}>{dayObj.day}</Text>
                        </View>
                      ) : (
                        <Text style={[
                          styles.dayCellText,
                          isToday && styles.dayCellTextToday,
                          (!isCurrentMonth || isPastDate) && styles.dayCellTextInactive
                        ]}>
                          {dayObj.day}
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  gradientBg: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Theme.spacing.lg,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 0,
    zIndex: 10,
    paddingBottom: Theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  avatarContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: Colors.primary,
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: moderateScale(20),
  },
  balancesPreviewRow: {
    flexDirection: 'row',
    gap: moderateScale(12),
  },
  miniBalanceCard: {
    width: moderateScale(130),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(18),
    padding: moderateScale(14),
    position: 'relative',
    overflow: 'hidden',
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 2,
  },
  miniCardLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    color: Colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: moderateScale(2),
  },
  miniCardValue: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: moderateScale(26),
  },
  miniCardDaysLabel: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(10),
    color: '#94A3B8',
  },
  miniCardProgressBg: {
    height: moderateScale(3),
    borderRadius: moderateScale(2),
    backgroundColor: '#F1F5F9',
    width: '100%',
    marginTop: moderateScale(8),
    overflow: 'hidden',
  },
  miniCardProgressFill: {
    height: '100%',
    borderRadius: moderateScale(2),
  },
  miniCardWatermark: {
    position: 'absolute',
    bottom: -moderateScale(8),
    right: -moderateScale(8),
    transform: [{ rotate: '-12deg' }],
  },
  mainFormCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(24),
    padding: moderateScale(18),
    gap: moderateScale(18),
    shadowColor: 'rgba(15, 23, 42, 0.08)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 4,
  },
  fieldSection: {
    gap: moderateScale(6),
  },
  fieldLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(2),
  },
  fieldLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(10),
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  calendarEditBtn: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(10),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFF2EE',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(255, 77, 28, 0.15)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(16),
    paddingHorizontal: moderateScale(14),
    height: moderateScale(54),
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(14),
    color: '#1E293B',
  },
  datesSelectionBox: {
    backgroundColor: '#FFF8F6',
    borderRadius: moderateScale(18),
    padding: moderateScale(14),
    borderWidth: 1,
    borderColor: '#FFEBE5',
  },
  datesGridRow: {
    flexDirection: 'row',
    gap: moderateScale(10),
  },
  dateCol: {
    flex: 1,
    gap: moderateScale(6),
  },
  dateColLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9.5),
    color: Colors.textSecondary,
    letterSpacing: 0.5,
    paddingLeft: moderateScale(2),
  },
  dateInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    paddingHorizontal: moderateScale(10),
    height: moderateScale(44),
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  dateInputText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(13),
    color: '#0F172A',
  },
  pillsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(4),
    marginTop: moderateScale(8),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    height: moderateScale(38),
  },
  pillBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(8),
    backgroundColor: 'transparent',
  },
  pillBtnActive: {
    backgroundColor: '#FF4D1C',
  },
  pillBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9.5),
    color: '#64748B',
  },
  pillBtnTextActive: {
    color: '#FFFFFF',
  },
  addRangeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    height: moderateScale(42),
    borderWidth: 1,
    borderColor: '#FFD2C6',
    marginTop: moderateScale(4),
  },
  addRangeButtonText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(13),
    color: '#8C3D2B',
  },
  checklistSection: {
    marginTop: moderateScale(4),
    gap: moderateScale(6),
  },
  checklistTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(11),
    color: '#0F172A',
    marginBottom: moderateScale(2),
  },
  checkItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: moderateScale(8),
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  checkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  checkbox: {
    width: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(4),
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: '#FF4D1C',
    borderColor: '#FF4D1C',
  },
  checkDateText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(12),
    color: '#0F172A',
  },
  checkPillTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: moderateScale(8),
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    gap: 4,
  },
  checkPillText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(10),
    color: '#64748B',
  },
  textInputBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(16),
    paddingHorizontal: moderateScale(14),
    paddingVertical: moderateScale(12),
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: moderateScale(70),
  },
  textInput: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(13),
    color: '#0F172A',
    padding: 0,
    textAlignVertical: 'top',
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#FFD2C6',
    borderStyle: 'dashed',
    borderRadius: moderateScale(18),
    backgroundColor: '#FFF8F6',
    paddingVertical: moderateScale(22),
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconBadge: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(22),
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(8),
    shadowColor: 'rgba(255, 77, 28, 0.1)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 2,
  },
  uploadBoxTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(13),
    color: '#0F172A',
    marginBottom: moderateScale(2),
  },
  uploadBoxSubtext: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: '#64748B',
  },
  attachmentFileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: moderateScale(14),
    padding: moderateScale(12),
    marginTop: moderateScale(10),
  },
  attachmentFileInfo: {
    flex: 1,
    marginLeft: moderateScale(10),
  },
  attachmentFileName: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(13),
    color: '#0F172A',
  },
  attachmentFileSize: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: '#FF4D1C',
    marginTop: moderateScale(1),
  },
  attachmentViewBtn: {
    padding: moderateScale(8),
    marginRight: moderateScale(4),
  },
  attachmentRemoveBtn: {
    padding: moderateScale(8),
  },
  formErrorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
    borderRadius: moderateScale(12),
    padding: moderateScale(10),
  },
  formErrorText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: '#EF4444',
    flex: 1,
  },
  submitBtn: {
    backgroundColor: '#FF4D1C',
    borderRadius: moderateScale(24),
    height: moderateScale(54),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: moderateScale(6),
    shadowColor: '#FF4D1C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: '#FFFFFF',
  },
  submitSubtext: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(10),
    color: '#64748B',
    textAlign: 'center',
    marginTop: -moderateScale(8),
    marginBottom: moderateScale(2),
  },
  draftSection: {
    gap: Theme.spacing.sm,
    paddingHorizontal: moderateScale(4),
  },
  draftSectionTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: '#0F172A',
  },
  draftItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: moderateScale(12),
    gap: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: 'rgba(15, 23, 42, 0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  draftItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  draftItemType: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(13),
    color: '#0F172A',
  },
  draftItemDays: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(13),
    color: '#FF4D1C',
  },
  draftItemPeriod: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: '#64748B',
  },
  draftItemFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: moderateScale(12),
    borderTopWidth: 0.5,
    borderTopColor: '#E2E8F0',
    paddingTop: moderateScale(8),
    marginTop: moderateScale(4),
  },
  draftActionLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  draftActionLinkText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(11),
  },
  bottomInfoContainer: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: moderateScale(18),
    padding: moderateScale(14),
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: moderateScale(10),
    shadowColor: 'rgba(15, 23, 42, 0.04)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomInfoIconFrame: {
    width: moderateScale(28),
    height: moderateScale(28),
    borderRadius: moderateScale(14),
    backgroundColor: '#FFF2EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomInfoText: {
    flex: 1,
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(12),
    color: '#475569',
    lineHeight: moderateScale(18),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(24),
    padding: moderateScale(16),
    width: '100%',
    maxWidth: moderateScale(320),
    maxHeight: '70%',
    shadowColor: 'rgba(15, 23, 42, 0.1)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 4,
  },
  modalTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: '#0F172A',
    marginBottom: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    paddingBottom: moderateScale(6),
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: moderateScale(12),
    borderBottomWidth: 0.5,
    borderBottomColor: '#E2E8F0',
  },
  modalItemText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(13),
    color: '#0F172A',
  },
  modalItemTextActive: {
    fontFamily: 'Outfit_700Bold',
    color: '#FF4D1C',
  },
  calendarContainer: {
    gap: moderateScale(10),
  },
  calendarHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: moderateScale(6),
  },
  monthNavBtn: {
    width: moderateScale(34),
    height: moderateScale(34),
    borderRadius: moderateScale(17),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarMonthYearText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: '#0F172A',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: moderateScale(4),
  },
  weekdayText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(11),
    color: Colors.textMuted,
    width: '14.28%',
    textAlign: 'center',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 4,
  },
  dayCell: {
    width: '14.28%',
    height: moderateScale(36),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: moderateScale(8),
  },
  dayCellSelected: {
    backgroundColor: '#FF4D1C',
  },
  daySelectedDot: {
    width: '100%',
    height: '100%',
    backgroundColor: '#FF4D1C',
    borderRadius: moderateScale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellInactive: {
    opacity: 0.35,
  },
  dayCellText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(12),
    color: '#0F172A',
  },
  dayCellTextSelected: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: '#FFFFFF',
  },
  dayCellTextToday: {
    color: '#FF4D1C',
    textDecorationLine: 'underline',
    fontWeight: '800',
  },
  dayCellTextInactive: {
    color: '#94A3B8',
  },
  workingTypeListSection: {
    marginTop: moderateScale(12),
    gap: moderateScale(8),
  },
  workingTypeListTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(12),
    color: '#0F172A',
    marginBottom: moderateScale(4),
  },
  workingTypeListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: moderateScale(8),
    paddingHorizontal: moderateScale(12),
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(10),
  },
  workingTypeDateText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(13),
    color: '#0F172A',
    flex: 1,
  },
  workingTypeOptions: {
    flexDirection: 'row',
    gap: moderateScale(6),
  },
  workingTypeOption: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(8),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  workingTypeOptionActive: {
    backgroundColor: '#FF4D1C',
    borderColor: '#FF4D1C',
  },
  workingTypeOptionText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(11),
    color: '#64748B',
  },
  workingTypeOptionTextActive: {
    color: '#FFFFFF',
  },
});

export default ApplyLeaveScreen;

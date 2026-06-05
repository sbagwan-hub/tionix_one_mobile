import React, { useMemo, useState, useEffect } from 'react';
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
import Ionicons from '../icons/Ionicons';
import { Colors as OriginalColors, Theme } from '../theme/colors';
import { Typography } from '../theme/typography';
import { moderateScale } from '../utils/responsive';
import { applyForLeave, getLeaveBalances, DEFAULT_LEAVE_TYPES } from '../services/leave';
import { getAuthSession } from '../services/auth';
import { ApiError } from '../services/apiClient';

// Premium Red-to-Orange gradient specific theme
const Colors = {
  primary: '#FE0000',
  secondary: '#F14A20',
  accent: '#E97132',
  background: '#FFFFFF',
  surface: '#F8F9FA',
  text: '#1A1A1A',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',
  border: '#E5E7EB',
  borderStrong: '#D1D5DB',
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
  black: '#000000',
};

const PRIMARY_GRADIENT = [Colors.primary, Colors.secondary, Colors.accent] as const;

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
};

const toDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

const ApplyLeaveScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  // 1. ERP Metadata State
  const [requestNo, setRequestNo] = useState('CE/26-27/LR0012');
  const [requestDate, setRequestDate] = useState('05-Jun-2026');
  const [employeeName, setEmployeeName] = useState('SUPERVISOR');
  
  // 2. Form Fields State
  const [startDate, setStartDate] = useState(toDateInput(new Date()));
  const [endDate, setEndDate] = useState(toDateInput(new Date()));
  const [leaveTypeId, setLeaveTypeId] = useState(DEFAULT_LEAVE_TYPES[0].id);
  const [workingType, setWorkingType] = useState('Full Day');
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  
  // 3. Dropdown Pickers State
  const [isEmployeePickerOpen, setIsEmployeePickerOpen] = useState(false);
  const [isLeaveTypePickerOpen, setIsLeaveTypePickerOpen] = useState(false);
  const [isWorkingTypePickerOpen, setIsWorkingTypePickerOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  
  // 4. Draft List & Editing state
  const [draftList, setDraftList] = useState<DraftItem[]>([]);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);

  // 5. Loading / Action Statuses
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 6. ERP Leave Balances
  const [balances, setBalances] = useState({
    annual: 12.5,
    paidHoliday: 6.0,
    sick: 8.0,
    paidCasual: 10.0,
    unpaidCasual: 30.0,
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
          const lowerLabel = item.label.toLowerCase();
          if (lowerLabel.includes('annual') || lowerLabel.includes('earned')) {
            updated.annual = remaining;
          } else if (lowerLabel.includes('sick')) {
            updated.sick = remaining;
          } else if (lowerLabel.includes('casual')) {
            updated.paidCasual = remaining;
          } else if (lowerLabel.includes('holiday')) {
            updated.paidHoliday = remaining;
          } else if (lowerLabel.includes('unpaid')) {
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

  const selectedLeaveType = useMemo(
    () => DEFAULT_LEAVE_TYPES.find(type => type.id === leaveTypeId) ?? DEFAULT_LEAVE_TYPES[0],
    [leaveTypeId],
  );

  // Active form calculated days
  const activeFormDays = useMemo(() => {
    if (workingType === 'First Half' || workingType === 'Second Half') {
      return 0.5;
    }
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
      return 0;
    }
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate, workingType]);

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

  const resetForm = () => {
    setStartDate(toDateInput(new Date()));
    setEndDate(toDateInput(new Date()));
    setLeaveTypeId(DEFAULT_LEAVE_TYPES[0].id);
    setWorkingType('Full Day');
    setReason('');
    setRemarks('');
    setEditingDraftId(null);
    setErrorMessage(null);
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

      const finalReason = remarks.trim() 
        ? `${trimmedReason} (Remarks: ${remarks.trim()})` 
        : trimmedReason;

      itemsToSubmit.push({
        leaveType: selectedLeaveType.label,
        startDate,
        endDate,
        reason: finalReason,
        isHalfDay: workingType === 'First Half' || workingType === 'Second Half',
      });
    }

    // Append all drafts
    draftList.forEach(draft => {
      const finalReason = draft.remarks 
        ? `${draft.reason} (Remarks: ${draft.remarks})` 
        : draft.reason;
      itemsToSubmit.push({
        leaveType: draft.leaveTypeLabel,
        startDate: draft.startDate,
        endDate: draft.endDate,
        reason: finalReason,
        isHalfDay: draft.workingType === 'First Half' || draft.workingType === 'Second Half',
      });
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
          contentContainerStyle={[styles.content, { paddingBottom: moderateScale(100) + insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* 2. Leave Balance Cards (Horizontal Row) */}
          <View style={styles.balancesSection}>
            <Text style={styles.sectionHeading}>Leave Balances</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.balancesScroll}>
              <View style={[styles.balanceCard, { borderLeftColor: '#E97132' }]}>
                <Text style={styles.balanceValue}>{balances.annual.toFixed(1)}</Text>
                <Text style={styles.balanceLabel}>Annual Leave</Text>
              </View>
              <View style={[styles.balanceCard, { borderLeftColor: '#3B82F6' }]}>
                <Text style={styles.balanceValue}>{balances.paidHoliday.toFixed(1)}</Text>
                <Text style={styles.balanceLabel}>Paid Holiday</Text>
              </View>
              <View style={[styles.balanceCard, { borderLeftColor: '#EF4444' }]}>
                <Text style={styles.balanceValue}>{balances.sick.toFixed(1)}</Text>
                <Text style={styles.balanceLabel}>Sick Leave</Text>
              </View>
              <View style={[styles.balanceCard, { borderLeftColor: '#22C55E' }]}>
                <Text style={styles.balanceValue}>{balances.paidCasual.toFixed(1)}</Text>
                <Text style={styles.balanceLabel}>Paid Casual</Text>
              </View>
              <View style={[styles.balanceCard, { borderLeftColor: '#6B7280' }]}>
                <Text style={styles.balanceValue}>{balances.unpaidCasual.toFixed(1)}</Text>
                <Text style={styles.balanceLabel}>Unpaid Leave</Text>
              </View>
            </ScrollView>
          </View>

          {/* 3. Leave Summary Metrics Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardHeading}>Monthly Summary</Text>
            <View style={styles.metricsGrid}>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Total Applied</Text>
                <Text style={[styles.metricValue, { color: Colors.primary }]}>
                  {summaryMetrics.totalApplied.toFixed(1)}d
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Remaining</Text>
                <Text style={[styles.metricValue, { color: Colors.success }]}>
                  {summaryMetrics.remaining.toFixed(1)}d
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Approved</Text>
                <Text style={[styles.metricValue, { color: '#3B82F6' }]}>
                  {summaryMetrics.approved.toFixed(1)}d
                </Text>
              </View>
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>Pending</Text>
                <Text style={[styles.metricValue, { color: Colors.warning }]}>
                  {summaryMetrics.pending.toFixed(1)}d
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
            <TouchableOpacity
              style={styles.dropdownTrigger}
              onPress={() => setIsEmployeePickerOpen(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.dropdownValueText}>{employeeName}</Text>
              <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
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
                <View style={styles.inputIconRow}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                  <TextInput
                    value={startDate}
                    onChangeText={setStartDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.textInput}
                    autoCapitalize="none"
                  />
                </View>
                <Text style={styles.hintText}>{formatDisplayDate(startDate)}</Text>
              </View>

              <View style={styles.halfCol}>
                <Text style={styles.inputLabel}>To Date</Text>
                <View style={styles.inputIconRow}>
                  <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
                  <TextInput
                    value={endDate}
                    onChangeText={setEndDate}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={Colors.textMuted}
                    style={styles.textInput}
                    autoCapitalize="none"
                    editable={workingType === 'Full Day'}
                  />
                </View>
                <Text style={styles.hintText}>
                  {workingType === 'Full Day' ? formatDisplayDate(endDate) : 'Disabled for Half Day'}
                </Text>
              </View>
            </View>
          </FormCard>

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
        <View style={styles.footerRow}>
          <TouchableOpacity style={styles.resetBtn} onPress={resetForm}>
            <Text style={styles.resetBtnText}>Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.draftBtn} onPress={handleSaveDraft}>
            <Text style={styles.draftBtnText}>{editingDraftId ? 'Update' : 'Add Draft'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.submitBtnWrapper} onPress={handleSubmit} disabled={isSubmitting}>
            <LinearGradient
              colors={PRIMARY_GRADIENT}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtnGradient}
            >
              <Text style={styles.submitBtnText}>Submit</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>

      {/* Modals for selectors */}
      {/* A. Employee Selector Modal */}
      <Modal visible={isEmployeePickerOpen} transparent animationType="fade" onRequestClose={() => setIsEmployeePickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsEmployeePickerOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={() => undefined}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Employee</Text>
              <TouchableOpacity onPress={() => setIsEmployeePickerOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {MOCK_EMPLOYEES.map(emp => (
                <TouchableOpacity
                  key={emp}
                  style={styles.modalItem}
                  onPress={() => {
                    setEmployeeName(emp);
                    setIsEmployeePickerOpen(false);
                  }}
                >
                  <Text style={[styles.modalItemText, employeeName === emp && styles.modalItemTextActive]}>{emp}</Text>
                  {employeeName === emp && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* B. Leave Type Selector Modal */}
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
              {DEFAULT_LEAVE_TYPES.map(type => (
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
  balancesScroll: {
    gap: Theme.spacing.sm,
    paddingRight: Theme.spacing.lg,
  },
  balanceCard: {
    backgroundColor: Colors.surface,
    borderRadius: Theme.borderRadius.lg,
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    minWidth: moderateScale(120),
    ...Theme.shadow.sm,
  },
  balanceValue: {
    ...Typography.title,
    fontSize: moderateScale(20),
    color: Colors.text,
  },
  balanceLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
    marginTop: 2,
    fontSize: moderateScale(11),
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
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
    backgroundColor: Colors.surface,
    borderRadius: Theme.borderRadius.md,
    padding: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderWidth: 1,
    borderColor: Colors.border,
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
    borderWidth: 1,
    borderColor: Colors.border,
    ...Theme.shadow.sm,
    gap: Theme.spacing.xs,
  },
  draftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.xs,
  },
  draftTypeBadge: {
    backgroundColor: 'rgba(254, 0, 0, 0.08)',
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
    paddingVertical: Theme.spacing.sm,
    ...Theme.shadow.floating,
  },
  footerRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
    alignItems: 'center',
  },
  resetBtn: {
    flex: 1.2,
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
    flex: 1.8,
    height: moderateScale(46),
    borderRadius: Theme.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: Colors.white,
  },
  draftBtnText: {
    ...Typography.body,
    color: Colors.accent,
    fontWeight: '800',
  },
  submitBtnWrapper: {
    flex: 2.2,
    height: moderateScale(46),
    borderRadius: Theme.borderRadius.md,
    overflow: 'hidden',
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
});

export default ApplyLeaveScreen;

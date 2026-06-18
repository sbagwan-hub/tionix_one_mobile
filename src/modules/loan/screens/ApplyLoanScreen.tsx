import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Modal,
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
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import AppCard from '../../../components/AppCard';
import PrimaryButton from '../../../components/PrimaryButton';
import TextField from '../../../components/TextField';
import Shimmer from '../../../components/Shimmer';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { getAuthSession } from '../../auth/services/auth';
import { calculateLocalEMI, submitLoanRequest } from '../services/loan';
import { getEmployees, EmployeeOption, LoanAmortizationLine } from '../services/loanRequest.service';

const LOAN_TYPES = ['Personal Loan', 'Home Loan', 'Vehicle Loan', 'Salary Advance', 'Festival Advance', 'Other'];
const RETURN_METHODS = ['Salary', 'Hand'];
const CALC_METHODS = ['Equated Monthly Method', 'Interest Calculation', 'Remaining Balance Calculation'];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatMonth = (value: string) => {
  try {
    const [year, month] = value.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  } catch {
    return value;
  }
};

const generateNext12Months = () => {
  const months = [];
  const date = new Date();
  for (let i = 0; i < 12; i++) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    months.push({ value: `${yyyy}-${mm}`, label });
    date.setMonth(date.getMonth() + 1);
  }
  return months;
};

const ApplyLoanScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<{ id: string; name: string } | null>(null);
  const [employeesList, setEmployeesList] = useState<EmployeeOption[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [transactionNo] = useState(() => {
    const year = new Date().getFullYear();
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `LN/${year}/${rand}`;
  });
  const [transactionDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedEmp, setSelectedEmp] = useState<{ id: string; name: string } | null>(null);
  const [loanType, setLoanType] = useState('Salary Advance');
  const [loanAmount, setLoanAmount] = useState('');
  const [voucherNo, setVoucherNo] = useState('');
  const [interestRate, setInterestRate] = useState('0');
  const [installments, setInstallments] = useState('6');
  const [returnThrough, setReturnThrough] = useState<'Salary' | 'Hand'>('Salary');
  const [deductFromMonth, setDeductFromMonth] = useState(() => {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  });
  const [calcMethod, setCalcMethod] = useState<'Equated Monthly Method' | 'Interest Calculation' | 'Remaining Balance Calculation'>('Equated Monthly Method');
  const [remarks, setRemarks] = useState('');

  // Dropdown Picker States
  const [isEmpPickerOpen, setIsEmpPickerOpen] = useState(false);
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [isReturnPickerOpen, setIsReturnPickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isMethodPickerOpen, setIsMethodPickerOpen] = useState(false);

  // EMI Schedule Preview States

  const monthOptions = useMemo(() => generateNext12Months(), []);

  // Fetch initial configuration & employees
  useEffect(() => {
    const initForm = async () => {
      try {
        setIsLoadingEmployees(true);
        const session = await getAuthSession();
        if (session) {
          const userRole = session.role;
          const userEmpId = String(session.user.fkEmpId || '');
          const userEmpName = session.user.UserName || 'Employee';
          
          setIsAdmin(userRole === 'admin');
          const self = { id: userEmpId, name: userEmpName };
          setCurrentEmp(self);
          setSelectedEmp(self);

          if (userRole === 'admin') {
            const list = await getEmployees();
            setEmployeesList(list);
          }
        }
      } catch (err) {
        console.warn('Failed to load employee list:', err);
      } finally {
        setIsLoadingEmployees(false);
      }
    };
    initForm();
  }, []);

  // Live EMI Amortization Schedule Calculation
  const emiPreview = useMemo(() => {
    const amount = parseFloat(loanAmount);
    const rate = parseFloat(interestRate);
    const tenure = parseInt(installments, 10);

    if (isNaN(amount) || amount <= 0 || isNaN(tenure) || tenure <= 0 || isNaN(rate) || rate < 0) {
      return null;
    }

    try {
      return calculateLocalEMI(amount, rate, tenure, calcMethod, deductFromMonth);
    } catch {
      return null;
    }
  }, [loanAmount, interestRate, installments, calcMethod, deductFromMonth]);

  const handleApplyLoan = async () => {
    if (!selectedEmp) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please select an employee.' });
      return;
    }

    const amount = parseFloat(loanAmount);
    const rate = parseFloat(interestRate);
    const tenure = parseInt(installments, 10);

    if (isNaN(amount) || amount <= 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid loan amount.' });
      return;
    }

    if (isNaN(tenure) || tenure <= 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Installments must be a positive integer.' });
      return;
    }

    if (isNaN(rate) || rate < 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Interest rate cannot be negative.' });
      return;
    }

    try {
      setIsSubmitting(true);
      await submitLoanRequest({
        loan_no: transactionNo,
        loan_date: transactionDate,
        fk_emp_id: selectedEmp.id,
        loan_type: loanType,
        loan_amount: amount,
        voucher_no: voucherNo || null,
        interest_rate: rate,
        installments: tenure,
        return_through: returnThrough,
        deduct_from_month: deductFromMonth,
        calc_method: calcMethod,
        remarks: remarks || null,
      });

      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Loan Request submitted successfully.',
      });

      navigation.goBack();
    } catch (err: any) {
      Toast.show({
        type: 'error',
        text1: 'Submission Failed',
        text2: err instanceof Error ? err.message : 'Something went wrong.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + moderateScale(40) }]}
      >
        {/* Employee Summary Card */}
        <TouchableOpacity
          style={styles.employeeCard}
          disabled={!isAdmin}
          onPress={() => isAdmin && setIsEmpPickerOpen(true)}
        >
          <View style={styles.employeeIconContainer}>
            <Ionicons name="person-outline" size={moderateScale(24)} color={Colors.primary} />
          </View>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>{selectedEmp?.name || 'Employee Name'}</Text>
            <Text style={styles.employeeLabel}>Employee</Text>
          </View>
          <View style={styles.refBadge}>
            <Text style={styles.refBadgeText}>REF NO</Text>
            <Text style={styles.refBadgeValue}>{transactionNo.split('/')[2] || '----'}</Text>
          </View>
          {isAdmin && <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />}
        </TouchableOpacity>

        {/* Loan Details Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="document-text-outline" size={20} color={Colors.text} />
            <Text style={styles.cardTitleText}>Loan Details</Text>
            <Text style={styles.cardDate}>{transactionDate}</Text>
          </View>

          {/* Loan Type */}
          <Text style={styles.label}>Loan Type</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setIsTypePickerOpen(true)}>
            <Text style={styles.dropdownText}>{loanType}</Text>
            <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Loan Amount + Interest Rate */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Loan Amount</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.input}
                  value={loanAmount}
                  onChangeText={setLoanAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Interest Rate (%)</Text>
              <TextInput
                style={styles.input}
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>

          {/* Installments + Voucher No */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.label}>Installments</Text>
              <TextInput
                style={styles.input}
                value={installments}
                onChangeText={setInstallments}
                keyboardType="numeric"
                placeholder="Months"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.label}>Voucher No</Text>
              <TextInput
                style={styles.input}
                value={voucherNo}
                onChangeText={setVoucherNo}
                placeholder="Optional"
              />
            </View>
          </View>
        </View>

        {/* Repayment Settings Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="calendar-outline" size={20} color={Colors.text} />
            <Text style={styles.cardTitleText}>Repayment Settings</Text>
          </View>

          {/* Return Through - Segmented Buttons */}
          <Text style={styles.label}>Return Through</Text>
          <View style={styles.segmentedContainer}>
            {RETURN_METHODS.map((method) => (
              <TouchableOpacity
                key={method}
                style={[
                  styles.segmentButton,
                  returnThrough === method && styles.segmentButtonActive,
                ]}
                onPress={() => setReturnThrough(method as any)}
              >
                <Text
                  style={[
                    styles.segmentButtonText,
                    returnThrough === method && styles.segmentButtonTextActive,
                  ]}
                >
                  {method}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Deduction Start Month */}
          <Text style={styles.label}>Start Month</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setIsMonthPickerOpen(true)}>
            <Text style={styles.dropdownText}>{formatMonth(deductFromMonth)}</Text>
            <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Calculation Method */}
          <Text style={styles.label}>Calculation Method</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setIsMethodPickerOpen(true)}>
            <Text style={styles.dropdownText}>{calcMethod}</Text>
            <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Remarks */}
          <Text style={styles.label}>Remarks</Text>
          <TextInput
            style={styles.textarea}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Add comments or justification..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Repayment Schedule Card */}
        {emiPreview ? (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="list-outline" size={20} color={Colors.text} />
              <Text style={styles.cardTitleText}>Repayment Schedule</Text>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={styles.tableHeaderText}>Month</Text>
              <Text style={styles.tableHeaderText}>Principal</Text>
              <Text style={styles.tableHeaderText}>Interest</Text>
              <Text style={styles.tableHeaderText}>EMI</Text>
            </View>

            {/* Table Rows */}
            {emiPreview.schedule.map((inst) => (
              <View key={inst.inst_no} style={styles.tableRow}>
                <Text style={styles.tableCellText}>{formatMonth(inst.inst_month)}</Text>
                <Text style={styles.tableCellText}>{formatCurrency(parseFloat(inst.principal_amount))}</Text>
                <Text style={styles.tableCellText}>{formatCurrency(parseFloat(inst.interest_amount))}</Text>
                <Text style={[styles.tableCellText, styles.tableCellEmi]}>
                  {formatCurrency(parseFloat(inst.total_payable))}
                </Text>
              </View>
            ))}

            {/* Total Row */}
            <View style={styles.tableTotalRow}>
              <Text style={styles.tableTotalLabel}>Total</Text>
              <Text style={styles.tableTotalText}>
                {formatCurrency(parseFloat(emiPreview.principal_amount))}
              </Text>
              <Text style={styles.tableTotalText}>
                {formatCurrency(parseFloat(emiPreview.interest_amount))}
              </Text>
              <Text style={[styles.tableTotalText, styles.tableTotalEmi]}>
                {formatCurrency(parseFloat(emiPreview.total_payable_amount))}
              </Text>
            </View>

            {/* Remaining Balance Row */}
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Remaining Balance</Text>
              <Text style={styles.balanceValue}>
                {formatCurrency(parseFloat(emiPreview.schedule[emiPreview.schedule.length - 1]?.bal_principal || 0))}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="calculator-outline" size={moderateScale(32)} color={Colors.borderStrong} />
            <Text style={styles.emptyStateText}>
              Enter loan details to see repayment schedule
            </Text>
          </View>
        )}

        {/* Submit Button */}
        <PrimaryButton
          label="Submit Loan Request"
          onPress={handleApplyLoan}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </ScrollView>

      {/* ── SELECT MODALS ───────────────────────────────────────── */}

      {/* Employee Picker Modal */}
      <Modal visible={isEmpPickerOpen} transparent animationType="fade" onRequestClose={() => setIsEmpPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsEmpPickerOpen(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Employee</Text>
              <TouchableOpacity onPress={() => setIsEmpPickerOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: moderateScale(300) }}>
              {employeesList.map((emp) => (
                <TouchableOpacity
                  key={emp.pk_emp_id}
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedEmp({ id: String(emp.pk_emp_id), name: emp.contact_name });
                    setIsEmpPickerOpen(false);
                  }}
                >
                  <Text style={[styles.modalItemText, selectedEmp?.id === String(emp.pk_emp_id) && styles.modalItemTextActive]}>
                    {emp.contact_name} ({emp.emp_code})
                  </Text>
                  {selectedEmp?.id === String(emp.pk_emp_id) && (
                    <Ionicons name="checkmark" size={18} color="#D92D20" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Loan Type Picker Modal */}
      <Modal visible={isTypePickerOpen} transparent animationType="fade" onRequestClose={() => setIsTypePickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsTypePickerOpen(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Loan Type</Text>
              <TouchableOpacity onPress={() => setIsTypePickerOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {LOAN_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  style={styles.modalItem}
                  onPress={() => {
                    setLoanType(type);
                    setIsTypePickerOpen(false);
                  }}
                >
                  <Text style={[styles.modalItemText, loanType === type && styles.modalItemTextActive]}>{type}</Text>
                  {loanType === type && <Ionicons name="checkmark" size={18} color="#D92D20" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Return Method Picker Modal */}
      <Modal visible={isReturnPickerOpen} transparent animationType="fade" onRequestClose={() => setIsReturnPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsReturnPickerOpen(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Return Through</Text>
              <TouchableOpacity onPress={() => setIsReturnPickerOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {RETURN_METHODS.map((method) => (
                <TouchableOpacity
                  key={method}
                  style={styles.modalItem}
                  onPress={() => {
                    setReturnThrough(method as any);
                    setIsReturnPickerOpen(false);
                  }}
                >
                  <Text style={[styles.modalItemText, returnThrough === method && styles.modalItemTextActive]}>{method}</Text>
                  {returnThrough === method && <Ionicons name="checkmark" size={18} color="#D92D20" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Deduction Start Month Picker Modal */}
      <Modal visible={isMonthPickerOpen} transparent animationType="fade" onRequestClose={() => setIsMonthPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsMonthPickerOpen(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deduction Start Month</Text>
              <TouchableOpacity onPress={() => setIsMonthPickerOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: moderateScale(300) }}>
              {monthOptions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={styles.modalItem}
                  onPress={() => {
                    setDeductFromMonth(opt.value);
                    setIsMonthPickerOpen(false);
                  }}
                >
                  <Text style={[styles.modalItemText, deductFromMonth === opt.value && styles.modalItemTextActive]}>
                    {opt.label}
                  </Text>
                  {deductFromMonth === opt.value && <Ionicons name="checkmark" size={18} color="#D92D20" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* Calculation Method Picker Modal */}
      <Modal visible={isMethodPickerOpen} transparent animationType="fade" onRequestClose={() => setIsMethodPickerOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setIsMethodPickerOpen(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Calculation Method</Text>
              <TouchableOpacity onPress={() => setIsMethodPickerOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {CALC_METHODS.map((method) => (
                <TouchableOpacity
                  key={method}
                  style={styles.modalItem}
                  onPress={() => {
                    setCalcMethod(method as any);
                    setIsOpenPickerState(); // closes picker
                  }}
                >
                  <Text style={[styles.modalItemText, calcMethod === method && styles.modalItemTextActive]}>{method}</Text>
                  {calcMethod === method && <Ionicons name="checkmark" size={18} color="#D92D20" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </View>
  );

  function setIsOpenPickerState() {
    setIsMethodPickerOpen(false);
  }
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F7F4F3',
  },
  header: {
    backgroundColor: '#F7F4F3',
    paddingBottom: Theme.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.xs,
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
  scrollContent: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  // Employee Summary Card
  employeeCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(24),
    padding: Theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Theme.shadow.sm,
  },
  employeeIconContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(12),
    backgroundColor: '#FFF4E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.md,
  },
  employeeInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  employeeName: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
    fontFamily: 'Outfit_600SemiBold',
  },
  employeeLabel: {
    ...Typography.caption,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginTop: 2,
  },
  refBadge: {
    backgroundColor: '#FFF4E5',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
  },
  refBadgeText: {
    ...Typography.caption,
    fontSize: moderateScale(10),
    color: '#D92D20',
    fontWeight: '700',
  },
  refBadgeValue: {
    ...Typography.heading,
    fontSize: moderateScale(14),
    color: '#D92D20',
    fontWeight: '700',
  },
  // Card Styles
  card: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(24),
    padding: Theme.spacing.md,
    ...Theme.shadow.sm,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  cardTitleText: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
    fontFamily: 'Outfit_700Bold',
    marginLeft: Theme.spacing.sm,
    flex: 1,
  },
  cardDate: {
    ...Typography.caption,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  // Form Elements
  label: {
    ...Typography.label,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginBottom: Theme.spacing.xs,
    marginLeft: 4,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F5F5F5',
    borderRadius: moderateScale(14),
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(14),
    marginBottom: Theme.spacing.md,
  },
  dropdownText: {
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.text,
    fontFamily: 'Outfit_600SemiBold',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: moderateScale(14),
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(14),
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: moderateScale(14),
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(14),
  },
  currencySymbol: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: '#D92D20',
    marginRight: Theme.spacing.xs,
  },
  textarea: {
    backgroundColor: '#F5F5F5',
    borderRadius: moderateScale(14),
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(14),
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.text,
    minHeight: moderateScale(80),
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  col: {
    flex: 1,
  },
  // Segmented Buttons
  segmentedContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderRadius: moderateScale(14),
    padding: moderateScale(4),
    marginBottom: Theme.spacing.md,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: moderateScale(10),
    alignItems: 'center',
    borderRadius: moderateScale(10),
  },
  segmentButtonActive: {
    backgroundColor: Colors.white,
    ...Theme.shadow.sm,
  },
  segmentButtonText: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    fontFamily: 'Outfit_600SemiBold',
  },
  segmentButtonTextActive: {
    color: '#D92D20',
  },
  // Table Styles
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: Theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: Theme.spacing.sm,
  },
  tableHeaderText: {
    flex: 1,
    ...Typography.caption,
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: Theme.spacing.sm,
  },
  tableCellText: {
    flex: 1,
    ...Typography.body,
    fontSize: moderateScale(12),
    color: Colors.text,
    textAlign: 'center',
  },
  tableCellEmi: {
    color: '#D92D20',
    fontWeight: '700',
  },
  tableTotalRow: {
    flexDirection: 'row',
    marginTop: Theme.spacing.sm,
    paddingTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  tableTotalLabel: {
    flex: 1,
    ...Typography.caption,
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    fontWeight: '700',
    textAlign: 'center',
  },
  tableTotalText: {
    flex: 1,
    ...Typography.body,
    fontSize: moderateScale(12),
    color: Colors.text,
    fontWeight: '700',
    textAlign: 'center',
  },
  tableTotalEmi: {
    color: '#D92D20',
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
    paddingTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  balanceLabel: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
  },
  balanceValue: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: '#D92D20',
    fontWeight: '700',
  },
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.xl,
    backgroundColor: Colors.white,
    borderRadius: moderateScale(24),
    gap: Theme.spacing.sm,
  },
  emptyStateText: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.textMuted,
    textAlign: 'center',
  },
  submitButton: {
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    paddingTop: Theme.spacing.lg,
    paddingHorizontal: Theme.spacing.lg,
    paddingBottom: Theme.spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  modalTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  modalClose: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalItemText: {
    ...Typography.body,
    fontSize: moderateScale(15),
    color: Colors.text,
  },
  modalItemTextActive: {
    color: '#D92D20',
    fontWeight: '700',
  },
});

export default ApplyLoanScreen;

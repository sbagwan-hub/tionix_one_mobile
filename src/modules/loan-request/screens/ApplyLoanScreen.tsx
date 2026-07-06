import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
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
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { LoanAmortizationLine } from '../services/loan-request.service';
import AppBar from '../../../components/AppBar';

interface LoanConfig {
  minAmount: number;
  maxAmount: number;
  defaultInterestRate: number;
  defaultInstallments: number;
  allowedInstallments: number[];
}

const LOAN_CONFIGS: Record<string, LoanConfig> = {
  'Salary Advance': {
    minAmount: 5000,
    maxAmount: 50000,
    defaultInterestRate: 0,
    defaultInstallments: 3,
    allowedInstallments: [1, 2, 3, 4, 5, 6],
  },
  'Festival Advance': {
    minAmount: 2000,
    maxAmount: 20000,
    defaultInterestRate: 0,
    defaultInstallments: 6,
    allowedInstallments: [1, 2, 3, 4, 5, 6, 10, 12],
  },
  'Personal Loan': {
    minAmount: 10000,
    maxAmount: 500000,
    defaultInterestRate: 12,
    defaultInstallments: 12,
    allowedInstallments: [6, 12, 18, 24, 36, 48, 60],
  },
  'Home Loan': {
    minAmount: 100000,
    maxAmount: 5000000,
    defaultInterestRate: 8.5,
    defaultInstallments: 120,
    allowedInstallments: [12, 24, 36, 48, 60, 120, 180, 240],
  },
  'Vehicle Loan': {
    minAmount: 50000,
    maxAmount: 1500000,
    defaultInterestRate: 9.5,
    defaultInstallments: 36,
    allowedInstallments: [12, 24, 36, 48, 60, 72, 84],
  },
  'Other': {
    minAmount: 1000,
    maxAmount: 1000000,
    defaultInterestRate: 10,
    defaultInstallments: 6,
    allowedInstallments: [1, 2, 3, 6, 12, 18, 24, 36],
  },
};

const LOAN_TYPES = Object.keys(LOAN_CONFIGS);
const RETURN_METHODS = ['Salary', 'Hand'];
const CALC_METHODS = ['Equated Monthly Method', 'Interest Calculation', 'Remaining Balance Calculation'];

const LOAN_DISCLAIMERS: Record<string, string> = {
  'Salary Advance': 'Eligibility: Requires minimum 6 months of continuous service. Max advance is capped at 50% of net monthly salary.',
  'Festival Advance': 'Eligibility: Available once per calendar year prior to major regional/national festivals.',
  'Personal Loan': 'Eligibility: Requires minimum 1 year of continuous service and active full-time status. Subject to credit assessment.',
  'Home Loan': 'Eligibility: Requires minimum 2 years of continuous service. Asset mortgage valuation documents must be provided.',
  'Vehicle Loan': 'Eligibility: Requires minimum 1 year of continuous service. Vehicle invoice and dealership details must be uploaded.',
  'Other': 'Eligibility: Evaluated case-by-case. Requires business justification and approval from senior management.',
};

const getInterestRateOptions = (type: string, tenureStr: string): number[] => {
  const tenure = parseInt(tenureStr, 10) || 0;
  switch (type) {
    case 'Salary Advance':
    case 'Festival Advance':
      return [0];
    case 'Personal Loan':
      return tenure <= 12 ? [10, 10.5, 11] : [11.5, 12, 12.5];
    case 'Home Loan':
      return tenure <= 60 ? [7.5, 8.0, 8.5] : [8.5, 9.0, 9.5];
    case 'Vehicle Loan':
      return tenure <= 36 ? [8.5, 9.0, 9.5] : [9.5, 10.0, 10.5];
    case 'Other':
    default:
      return tenure <= 12 ? [9.0, 9.5, 10.0] : [10.0, 10.5, 11.0];
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(amount);
};

const formatFullDate = (value: string) => {
  try {
    const [year, month, day] = value.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day || '1', 10));
    return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return value;
  }
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

const InputWrapper = ({
  icon,
  label,
  children,
  style,
  containerStyle,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
  style?: any;
  containerStyle?: any;
}) => {
  const isTextArea = style && style.alignItems === 'flex-start';
  return (
    <View style={[styles.inputWrapperContainer, containerStyle]}>
      <Text style={styles.inputWrapperLabel}>{label}</Text>
      <View style={[styles.inputFieldContainer, style]}>
        <Ionicons
          name={icon as any}
          size={moderateScale(16)}
          color="#64748B"
          style={[styles.inputFieldIcon, isTextArea && { marginTop: moderateScale(12) }]}
        />
        {children}
      </View>
    </View>
  );
};

const ApplyLoanScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentEmp, setCurrentEmp] = useState<{ id: string; name: string } | null>(null);
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
  const [interestRate, setInterestRate] = useState(() => String(LOAN_CONFIGS['Salary Advance'].defaultInterestRate));
  const [installments, setInstallments] = useState(() => String(LOAN_CONFIGS['Salary Advance'].defaultInstallments));
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
  const [isTypePickerOpen, setIsTypePickerOpen] = useState(false);
  const [isReturnPickerOpen, setIsReturnPickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isMethodPickerOpen, setIsMethodPickerOpen] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);

  const currentConfig = LOAN_CONFIGS[loanType] || LOAN_CONFIGS['Other'];

  // EMI Schedule Preview States

  const monthOptions = useMemo(() => generateNext12Months(), []);

  // Fetch initial configuration & employees
  useEffect(() => {
    const initForm = async () => {
      try {
        const session = await getAuthSession();
        if (session) {
          const userRole = session.role;
          const userEmpId = String(session.user.fkEmpId || '');
          const userEmpName = session.user.UserName || 'Employee';
          
          setIsAdmin(userRole === 'admin');
          const self = { id: userEmpId, name: userEmpName };
          setCurrentEmp(self);
          setSelectedEmp(self);
        }
      } catch (err) {
        console.warn('Failed to load session details:', err);
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

    if (!isTermsAccepted) {
      Toast.show({
        type: 'error',
        text1: 'Terms & Conditions',
        text2: 'Please read and agree to the Terms & Conditions and Privacy Policy.',
      });
      return;
    }

    const amount = parseFloat(loanAmount);
    const rate = parseFloat(interestRate);
    const tenure = parseInt(installments, 10);

    if (isNaN(amount) || amount <= 0) {
      Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter a valid loan amount.' });
      return;
    }

    const config = LOAN_CONFIGS[loanType] || LOAN_CONFIGS['Other'];
    if (amount < config.minAmount || amount > config.maxAmount) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: `Loan amount for ${loanType} must be between ${formatCurrency(config.minAmount)} and ${formatCurrency(config.maxAmount)}.`,
      });
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

      navigation.navigate('MyLoans', { refresh: true });
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

      {/* Custom AppBar */}
      <AppBar title="Apply for Loan" showBackButton onBackPress={() => navigation.goBack()} />

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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + moderateScale(40) }]}
      >
        {/* Employee Summary Card */}
        <View style={styles.employeeCard}>
          <LinearGradient
            colors={['rgba(255, 77, 28, 0.12)', 'rgba(255, 140, 0, 0.06)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.employeeIconGradientContainer}
          >
            <Ionicons name="person-outline" size={moderateScale(20)} color={Colors.primary} />
          </LinearGradient>
          <View style={styles.employeeInfo}>
            <Text style={styles.employeeName}>{selectedEmp?.name || 'Employee Name'}</Text>
            <Text style={styles.employeeLabel}>Employee</Text>
          </View>
          <View style={styles.refBadge}>
            <Text style={styles.refBadgeText}>REF NO</Text>
            <Text style={styles.refBadgeValue}>{transactionNo.split('/')[2] || '----'}</Text>
          </View>
        </View>

        {/* Loan Details Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Ionicons name="document-text-outline" size={20} color={Colors.text} />
            <Text style={styles.cardTitleText}>Loan Details</Text>
            <Text style={styles.cardDate}>{transactionDate}</Text>
          </View>

          {/* Loan Type */}
          <InputWrapper icon="card-outline" label="LOAN TYPE">
            <TouchableOpacity style={styles.dropdownField} onPress={() => setIsTypePickerOpen(true)}>
              <Text style={styles.dropdownFieldText}>{loanType}</Text>
              <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </InputWrapper>

          {/* Eligibility Limit Disclaimer */}
          {LOAN_DISCLAIMERS[loanType] && (
            <View style={styles.disclaimerContainer}>
              <Ionicons name="information-circle-outline" size={20} color={Colors.primary} style={styles.disclaimerIcon} />
              <Text style={styles.disclaimerText}>{LOAN_DISCLAIMERS[loanType]}</Text>
            </View>
          )}

          {/* Loan Amount + Interest Rate */}
          <View style={styles.row}>
            <View style={styles.col}>
              <InputWrapper icon="cash-outline" label="LOAN AMOUNT">
                <View style={styles.currencyInputContainer}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.textInputField}
                    value={loanAmount}
                    onChangeText={setLoanAmount}
                    keyboardType="numeric"
                    placeholder={`Min ${currentConfig.minAmount}`}
                    placeholderTextColor={Colors.textMuted}
                  />
                </View>
              </InputWrapper>
              <Text style={styles.limitHelperText}>
                Limit: {formatCurrency(currentConfig.minAmount)} - {formatCurrency(currentConfig.maxAmount)}
              </Text>
            </View>
            <View style={styles.col}>
              <InputWrapper icon="trending-up-outline" label="INTEREST RATE">
                <View style={styles.currencyInputContainer}>
                  <TextInput
                    style={styles.textInputField}
                    value={interestRate}
                    onChangeText={setInterestRate}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <Text style={styles.currencyPrefix}>%</Text>
                </View>
              </InputWrapper>
            </View>
          </View>

          {/* Installments + Voucher No */}
          <View style={styles.row}>
            <View style={styles.col}>
              <InputWrapper icon="time-outline" label="INSTALLMENTS">
                <View style={styles.currencyInputContainer}>
                  <TextInput
                    style={styles.textInputField}
                    value={installments}
                    onChangeText={setInstallments}
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                  />
                  <Text style={styles.currencyPrefix}>Months</Text>
                </View>
              </InputWrapper>
            </View>
            <View style={styles.col}>
              <InputWrapper icon="receipt-outline" label="VOUCHER NO">
                <TextInput
                  style={styles.textInputField}
                  value={voucherNo}
                  onChangeText={setVoucherNo}
                  placeholder="Optional"
                  placeholderTextColor={Colors.textMuted}
                />
              </InputWrapper>
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
          <Text style={styles.inputWrapperLabel}>RETURN THROUGH</Text>
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
          <InputWrapper icon="calendar-outline" label="START MONTH">
            <TouchableOpacity style={styles.dropdownField} onPress={() => setIsMonthPickerOpen(true)}>
              <Text style={styles.dropdownFieldText}>{formatMonth(deductFromMonth)}</Text>
              <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </InputWrapper>

          {/* Calculation Method */}
          <InputWrapper icon="calculator-outline" label="CALCULATION METHOD">
            <TouchableOpacity style={styles.dropdownField} onPress={() => setIsMethodPickerOpen(true)}>
              <Text style={styles.dropdownFieldText}>{calcMethod}</Text>
              <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />
            </TouchableOpacity>
          </InputWrapper>

          {/* Remarks */}
          <InputWrapper
            icon="create-outline"
            label="REMARKS"
            style={styles.textareaInputContainer}
          >
            <TextInput
              style={styles.textareaInputField}
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Add comments or justification..."
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </InputWrapper>
        </View>

        {/* Repayment Schedule Card */}
        {emiPreview ? (
          <View style={styles.card}>
            <View style={styles.cardTitleRow}>
              <Ionicons name="list-outline" size={20} color={Colors.text} />
              <Text style={styles.cardTitleText}>Repayment Schedule</Text>
            </View>

            {/* Table Header */}
            <View style={styles.tableHeaderContainer}>
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
                {formatCurrency(parseFloat(emiPreview.schedule[emiPreview.schedule.length - 1]?.bal_principal || '0'))}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.scheduleEmptyWidget}>
            <View style={styles.scheduleEmptyIconContainer}>
              <Ionicons name="calculator-outline" size={moderateScale(24)} color="#94A3B8" />
            </View>
            <Text style={styles.scheduleEmptyTitle}>Calculation Preview</Text>
            <Text style={styles.scheduleEmptySubtitle}>
              Enter amount and tenure details above to preview your monthly EMI schedule.
            </Text>
          </View>
        )}

        {/* Acknowledgement and Terms checkbox */}
        <View style={styles.acknowledgementRow}>
          <TouchableOpacity
            style={[styles.checkboxHitArea]}
            onPress={() => setIsTermsAccepted(!isTermsAccepted)}
            activeOpacity={0.8}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <View style={[styles.checkbox, isTermsAccepted && styles.checkboxActive]}>
              {isTermsAccepted && <Ionicons name="checkmark" size={moderateScale(12)} color="#FFF" />}
            </View>
          </TouchableOpacity>
          <Text style={styles.acknowledgementText}>
            {'I acknowledge and agree to the '}
            <Text
              style={styles.linkText}
              onPress={() => setIsTermsModalOpen(true)}
              suppressHighlighting
            >Terms {'&'} Conditions</Text>
            {' and '}
            <Text
              style={styles.linkText}
              onPress={() => setIsTermsModalOpen(true)}
              suppressHighlighting
            >Privacy Policy</Text>
            {'.'}
          </Text>
        </View>

        {/* Submit Button */}
        <PrimaryButton
          label="Submit Loan Request"
          onPress={handleApplyLoan}
          loading={isSubmitting}
          style={styles.submitButton}
        />
      </ScrollView>

      {/* ── SELECT MODALS ───────────────────────────────────────── */}



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
                    const config = LOAN_CONFIGS[type] || LOAN_CONFIGS['Other'];
                    const defaultInstallments = String(config.defaultInstallments);
                    setInstallments(defaultInstallments);
                    
                    const rateOpts = getInterestRateOptions(type, defaultInstallments);
                    const defaultRate = rateOpts[Math.floor(rateOpts.length / 2)];
                    setInterestRate(String(defaultRate));

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



      {/* Terms and Conditions Modal */}
      <Modal visible={isTermsModalOpen} transparent animationType="slide" onRequestClose={() => setIsTermsModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { maxHeight: '85%', width: '100%', paddingBottom: Math.max(insets.bottom, moderateScale(16)) + moderateScale(8) }]}>
            <View style={styles.dragHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Terms & Privacy Policy</Text>
              <TouchableOpacity onPress={() => setIsTermsModalOpen(false)} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: moderateScale(20) }}>
              <Text style={styles.termsSectionTitle}>1. Loan Request Terms & Conditions</Text>
              <Text style={styles.termsBodyText}>
                By applying for this loan, you acknowledge and agree that this request is subject to eligibility verification and management approval. Approved loan amounts will be deducted from your salary according to the selected installments plan. If you resign or your employment is terminated before full repayment, the remaining balance will be adjusted against your final settlement.
              </Text>
              
              <Text style={styles.termsSectionTitle}>2. Interest and Calculation</Text>
              <Text style={styles.termsBodyText}>
                Interest rates are determined dynamically based on the selected loan type and tenure. Calculations follow standard financial methods (Equated Monthly Method or remaining balance calculation).
              </Text>
              
              <Text style={styles.termsSectionTitle}>3. Privacy Policy</Text>
              <Text style={styles.termsBodyText}>
                We collect and process your financial details solely for the purpose of assessing and servicing your loan request. Your data is stored securely and shared only with authorized human resources and payroll departments in compliance with active data privacy rules.
              </Text>
            </ScrollView>
            <PrimaryButton
              label="Accept & Close"
              onPress={() => {
                setIsTermsAccepted(true);
                setIsTermsModalOpen(false);
              }}
              style={{ marginTop: moderateScale(12) }}
            />
          </View>
        </View>
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
    backgroundColor: '#F8FAFC',
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: moderateScale(200),
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
    width: moderateScale(160),
    height: moderateScale(160),
    borderRadius: moderateScale(80),
    backgroundColor: 'rgba(255, 179, 0, 0.08)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(20),
    right: -moderateScale(50),
    width: moderateScale(200),
    height: moderateScale(200),
    borderRadius: moderateScale(100),
    backgroundColor: 'rgba(255, 77, 28, 0.05)',
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
  employeeIconGradientContainer: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(12),
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
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.sm,
    alignItems: 'center',
  },
  refBadgeText: {
    ...Typography.caption,
    fontSize: moderateScale(10),
    color: Colors.primary,
    fontWeight: '700',
  },
  refBadgeValue: {
    ...Typography.heading,
    fontSize: moderateScale(14),
    color: Colors.primary,
    fontWeight: '700',
  },
  // Card Styles
  card: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(24),
    padding: Theme.spacing.md,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
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
  inputWrapperContainer: {
    marginBottom: Theme.spacing.md,
  },
  inputWrapperLabel: {
    ...Typography.label,
    fontSize: moderateScale(11),
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    marginBottom: Theme.spacing.xs,
    marginLeft: 4,
    fontFamily: 'Outfit_600SemiBold',
  },
  inputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(12),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: Theme.spacing.md,
    height: moderateScale(48),
  },
  inputFieldIcon: {
    marginRight: moderateScale(10),
  },
  dropdownField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: '100%',
  },
  dropdownFieldText: {
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.text,
    fontFamily: 'Outfit_600SemiBold',
  },
  textInputField: {
    flex: 1,
    height: '100%',
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.text,
    fontFamily: 'Outfit_400Regular',
    paddingVertical: 0,
  },
  currencyInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  currencyPrefix: {
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.text,
    fontFamily: 'Outfit_600SemiBold',
    marginRight: moderateScale(4),
  },
  textareaInputContainer: {
    height: undefined,
    minHeight: moderateScale(100),
    alignItems: 'flex-start',
    paddingVertical: moderateScale(8),
  },
  textareaInputField: {
    flex: 1,
    width: '100%',
    minHeight: moderateScale(80),
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.text,
    fontFamily: 'Outfit_400Regular',
    textAlignVertical: 'top',
    paddingTop: moderateScale(4),
    paddingBottom: 0,
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
    backgroundColor: '#F1F5F9',
    borderRadius: moderateScale(12),
    padding: moderateScale(4),
    marginBottom: Theme.spacing.md,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: moderateScale(8),
    alignItems: 'center',
    borderRadius: moderateScale(8),
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
    color: Colors.primary,
  },
  // Table Styles
  tableHeaderContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    paddingVertical: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.xs,
    borderRadius: moderateScale(8),
    marginBottom: Theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
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
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  tableCellText: {
    flex: 1,
    ...Typography.body,
    fontSize: moderateScale(12),
    color: Colors.text,
    textAlign: 'center',
  },
  tableCellEmi: {
    color: Colors.primary,
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
    color: Colors.primary,
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
    color: Colors.primary,
    fontWeight: '700',
  },
  // Empty State Widget
  scheduleEmptyWidget: {
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(20),
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    paddingVertical: moderateScale(24),
    paddingHorizontal: moderateScale(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: moderateScale(4),
  },
  scheduleEmptyIconContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(12),
  },
  scheduleEmptyTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: '#475569',
    marginBottom: moderateScale(4),
  },
  scheduleEmptySubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: moderateScale(12),
    color: '#94A3B8',
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
    color: Colors.primary,
    fontWeight: '700',
  },
  limitHelperText: {
    fontSize: moderateScale(10),
    color: '#64748B',
    marginTop: 4,
    marginLeft: 4,
    fontFamily: 'Outfit_400Regular',
  },
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 77, 28, 0.05)',
    borderLeftWidth: 3,
    borderLeftColor: '#FF4D1C',
    borderRadius: moderateScale(10),
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.sm,
    marginBottom: Theme.spacing.md,
    gap: moderateScale(8),
  },
  disclaimerIcon: {
    alignSelf: 'flex-start',
    marginTop: 1,
  },
  disclaimerText: {
    ...Typography.caption,
    fontSize: moderateScale(11),
    color: '#1E293B',
    flex: 1,
    lineHeight: moderateScale(15),
    fontFamily: 'Outfit_400Regular',
  },
  acknowledgementRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Theme.spacing.xs,
    marginVertical: Theme.spacing.md,
    gap: moderateScale(10),
  },
  checkboxHitArea: {
    padding: moderateScale(4),
    marginTop: moderateScale(1),
  },
  acknowledgementTextContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  checkbox: {
    width: moderateScale(18),
    height: moderateScale(18),
    borderRadius: moderateScale(4),
    borderWidth: 1.5,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxActive: {
    backgroundColor: '#FF4D1C',
    borderColor: '#FF4D1C',
  },
  acknowledgementText: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: '#334155',
    flex: 1,
    fontFamily: 'Outfit_400Regular',
    lineHeight: moderateScale(18),
  },
  linkText: {
    color: '#FF4D1C',
    fontFamily: 'Outfit_600SemiBold',
    textDecorationLine: 'underline',
  },
  termsSectionTitle: {
    ...Typography.heading,
    fontSize: moderateScale(14),
    color: Colors.text,
    fontFamily: 'Outfit_600SemiBold',
    marginTop: Theme.spacing.md,
    marginBottom: Theme.spacing.xs,
  },
  termsBodyText: {
    ...Typography.body,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    fontFamily: 'Outfit_400Regular',
    lineHeight: moderateScale(16),
  },
  dragHandle: {
    width: moderateScale(40),
    height: moderateScale(4),
    borderRadius: moderateScale(2),
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: moderateScale(10),
  },
});

export default ApplyLoanScreen;

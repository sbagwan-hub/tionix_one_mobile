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
import { LinearGradient } from 'expo-linear-gradient';
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
  const [expandedInstallments, setExpandedInstallments] = useState<Record<number, boolean>>({});

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

  const toggleInstallment = (instNo: number) => {
    setExpandedInstallments((prev) => ({
      ...prev,
      [instNo]: !prev[instNo],
    }));
  };

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
          <Text style={styles.headerTitle}>Apply for Loan</Text>
          <View style={styles.headerSpacer} />
        </View>
      </SafeAreaView>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + moderateScale(40) }]}
      >
        {/* Loan Details Card */}
        <AppCard style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="wallet-outline" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Loan Details</Text>
          </View>

          <View style={styles.sectionDivider} />
          {/* Read Only Fields */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Transaction No</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{transactionNo}</Text>
              </View>
            </View>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Date</Text>
              <View style={styles.readOnlyField}>
                <Text style={styles.readOnlyText}>{transactionDate}</Text>
              </View>
            </View>
          </View>

          {/* Employee Picker */}
          <Text style={styles.inputLabel}>Employee</Text>
          <TouchableOpacity
            style={[styles.pickerButton, !isAdmin && styles.pickerDisabled]}
            disabled={!isAdmin}
            onPress={() => setIsEmpPickerOpen(true)}
          >
            {isLoadingEmployees ? (
              <Shimmer width="60%" height={16} borderRadius={4} />
            ) : (
              <>
                <Text style={styles.pickerButtonText}>
                  {selectedEmp ? selectedEmp.name : 'Select Employee'}
                </Text>
                {isAdmin && <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />}
              </>
            )}
          </TouchableOpacity>

          {/* Loan Type Picker */}
          <Text style={styles.inputLabel}>Loan Type</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setIsTypePickerOpen(true)}>
            <Text style={styles.pickerButtonText}>{loanType}</Text>
            <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Numeric Fields */}
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Loan Amount (₹)</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={loanAmount}
                  onChangeText={setLoanAmount}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Interest Rate (%)</Text>
              <TextInput
                style={styles.input}
                value={interestRate}
                onChangeText={setInterestRate}
                keyboardType="numeric"
                placeholder="0"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Installments</Text>
              <TextInput
                style={styles.input}
                value={installments}
                onChangeText={setInstallments}
                keyboardType="numeric"
                placeholder="Months"
              />
            </View>
            <View style={styles.col}>
              <Text style={styles.inputLabel}>Voucher No</Text>
              <TextInput
                style={styles.input}
                value={voucherNo}
                onChangeText={setVoucherNo}
                placeholder="Optional"
              />
            </View>
          </View>
        </AppCard>

        {/* Repayment Settings Card */}
        <AppCard style={styles.formCard}>
          <View style={styles.cardHeader}>
            <Ionicons name="calendar-outline" size={20} color={Colors.primary} />
            <Text style={styles.cardTitle}>Repayment Settings</Text>
          </View>

          <View style={styles.sectionDivider} />

          {/* Return Through Picker */}
          <Text style={styles.inputLabel}>Return Through</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setIsReturnPickerOpen(true)}>
            <Text style={styles.pickerButtonText}>{returnThrough}</Text>
            <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Deduction From Month Picker */}
          <Text style={styles.inputLabel}>Deduction Start Month</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setIsMonthPickerOpen(true)}>
            <Text style={styles.pickerButtonText}>{formatMonth(deductFromMonth)}</Text>
            <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Calculation Method Picker */}
          <Text style={styles.inputLabel}>Calculation Method</Text>
          <TouchableOpacity style={styles.pickerButton} onPress={() => setIsMethodPickerOpen(true)}>
            <Text style={styles.pickerButtonText}>{calcMethod}</Text>
            <Ionicons name="chevron-down-outline" size={16} color={Colors.textSecondary} />
          </TouchableOpacity>

          {/* Remarks */}
          <Text style={styles.inputLabel}>Remarks</Text>
          <TextInput
            style={styles.remarksInput}
            value={remarks}
            onChangeText={setRemarks}
            placeholder="Add comments or justification..."
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </AppCard>

        {/* Real-time EMI Preview Section */}
        {emiPreview ? (
          <View style={styles.previewContainer}>
            <Text style={styles.previewHeading}>Live EMI Preview</Text>
            
            <AppCard style={styles.summaryCard}>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Loan Principal</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(parseFloat(emiPreview.principal_amount))}</Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Total Interest</Text>
                  <Text style={[styles.summaryValue, { color: Colors.primary }]}>
                    {formatCurrency(parseFloat(emiPreview.interest_amount))}
                  </Text>
                </View>
              </View>
              <View style={styles.divider} />
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Monthly EMI</Text>
                  <Text style={[styles.summaryValue, { fontSize: moderateScale(18), color: Colors.success }]}>
                    {calcMethod === 'Remaining Balance Calculation'
                      ? `${formatCurrency(parseFloat(emiPreview.monthly_emi))} (Avg)`
                      : formatCurrency(parseFloat(emiPreview.monthly_emi))}
                  </Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text style={styles.summaryLabel}>Total Payable</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(parseFloat(emiPreview.total_payable_amount))}</Text>
                </View>
              </View>
            </AppCard>

            <Text style={styles.scheduleTitle}>Amortization Schedule Preview</Text>
            {emiPreview.schedule.map((inst) => {
              const isExpanded = !!expandedInstallments[inst.inst_no];
              return (
                <TouchableOpacity
                  key={inst.inst_no}
                  activeOpacity={0.9}
                  onPress={() => toggleInstallment(inst.inst_no)}
                >
                  <AppCard style={styles.instCard}>
                    <View style={styles.instHeader}>
                      <View style={styles.instHeaderLeft}>
                        <View style={styles.instBadge}>
                          <Text style={styles.instBadgeText}>#{inst.inst_no}</Text>
                        </View>
                        <Text style={styles.instMonthText}>{formatMonth(inst.inst_month)}</Text>
                      </View>
                      <View style={styles.instHeaderRight}>
                        <Text style={styles.instEmiText}>{formatCurrency(parseFloat(inst.total_payable))}</Text>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={16}
                          color={Colors.textSecondary}
                          style={{ marginLeft: 6 }}
                        />
                      </View>
                    </View>

                    {isExpanded && (
                      <View style={styles.instDetails}>
                        <View style={styles.instDetailRow}>
                          <Text style={styles.instDetailLabel}>Principal Portion</Text>
                          <Text style={styles.instDetailVal}>{formatCurrency(parseFloat(inst.principal_amount))}</Text>
                        </View>
                        <View style={styles.instDetailRow}>
                          <Text style={styles.instDetailLabel}>Interest Portion</Text>
                          <Text style={styles.instDetailVal}>{formatCurrency(parseFloat(inst.interest_amount))}</Text>
                        </View>
                        <View style={styles.instDetailRow}>
                          <Text style={styles.instDetailLabel}>Additional Interest</Text>
                          <Text style={styles.instDetailVal}>{formatCurrency(parseFloat(inst.add_interest_amount))}</Text>
                        </View>
                        <View style={styles.detailDivider} />
                        <View style={styles.instDetailRow}>
                          <Text style={[styles.instDetailLabel, { fontWeight: '700', color: Colors.text }]}>
                            Total Monthly Pay
                          </Text>
                          <Text style={[styles.instDetailVal, { fontWeight: '800', color: Colors.text }]}>
                            {formatCurrency(parseFloat(inst.total_payable))}
                          </Text>
                        </View>
                        <View style={styles.instDetailRow}>
                          <Text style={styles.instDetailLabel}>Remaining Principal Balance</Text>
                          <Text style={styles.instDetailVal}>{formatCurrency(parseFloat(inst.bal_principal))}</Text>
                        </View>
                      </View>
                    )}
                  </AppCard>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.previewEmptyContainer}>
            <Ionicons name="calculator-outline" size={moderateScale(32)} color={Colors.borderStrong} />
            <Text style={styles.previewEmptyText}>
              Enter loan amount, installments, and interest rate to see live amortization preview.
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
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
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
                  {loanType === type && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
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
                  {returnThrough === method && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
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
                  {deductFromMonth === opt.value && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
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
                  {calcMethod === method && <Ionicons name="checkmark" size={18} color={Colors.primary} />}
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
    backgroundColor: Colors.white,
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: moderateScale(180),
    overflow: 'hidden',
  },
  bannerGradient: {
    flex: 1,
  },
  bannerBlurOrb1: {
    position: 'absolute',
    top: -moderateScale(50),
    left: -moderateScale(50),
    width: moderateScale(150),
    height: moderateScale(150),
    borderRadius: moderateScale(75),
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(40),
    right: -moderateScale(60),
    width: moderateScale(200),
    height: moderateScale(200),
    borderRadius: moderateScale(100),
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
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
  formCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0,
    ...Theme.shadow.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    marginBottom: Theme.spacing.sm,
  },
  cardTitle: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
    fontFamily: 'Outfit_700Bold',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginBottom: Theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
  },
  col: {
    flex: 1,
  },
  readOnlyField: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(12),
    borderWidth: 1,
    borderColor: Colors.border,
  },
  readOnlyText: {
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.text,
    fontFamily: 'Outfit_600SemiBold',
  },
  input: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(12),
    borderWidth: 1,
    borderColor: Colors.border,
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(12),
  },
  currencySymbol: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.primary,
    marginRight: Theme.spacing.xs,
  },
  amountInput: {
    flex: 1,
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
    fontFamily: 'Outfit_700Bold',
  },
  inputLabel: {
    ...Typography.label,
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    marginBottom: Theme.spacing.sm,
    marginLeft: 4,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(14),
    marginBottom: Theme.spacing.md,
  },
  pickerDisabled: {
    opacity: 0.8,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  pickerButtonText: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(16),
    color: Colors.text,
  },
  remarksInput: {
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.borderRadius.lg,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(12),
    borderWidth: 1,
    borderColor: Colors.border,
    ...Typography.body,
    fontSize: moderateScale(14),
    color: Colors.text,
    minHeight: moderateScale(80),
    textAlignVertical: 'top',
  },
  submitButton: {
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.lg,
  },
  previewContainer: {
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.sm,
  },
  previewHeading: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
    marginLeft: 4,
    marginBottom: 2,
  },
  summaryCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.md,
    borderWidth: 0,
    ...Theme.shadow.sm,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: moderateScale(4),
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    ...Typography.caption,
    color: Colors.textMuted,
  },
  summaryValue: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Theme.spacing.sm,
  },
  scheduleTitle: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
    marginLeft: 4,
    marginTop: Theme.spacing.md,
    marginBottom: 2,
  },
  instCard: {
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.sm,
    borderWidth: 0,
    ...Theme.shadow.sm,
  },
  instHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  instBadge: {
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Theme.borderRadius.sm,
  },
  instBadgeText: {
    ...Typography.caption,
    color: Colors.primary,
    fontWeight: '700',
  },
  instMonthText: {
    ...Typography.body,
    fontSize: moderateScale(14),
    fontFamily: 'Outfit_600SemiBold',
    color: Colors.text,
  },
  instHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  instEmiText: {
    ...Typography.heading,
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  instDetails: {
    marginTop: Theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Theme.spacing.sm,
    gap: 8,
  },
  instDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  instDetailLabel: {
    ...Typography.caption,
    color: Colors.textSecondary,
  },
  instDetailVal: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.text,
    fontFamily: 'Outfit_600SemiBold',
  },
  detailDivider: {
    height: 0.5,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  previewEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Theme.spacing.xl,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.borderRadius.xl,
    gap: Theme.spacing.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.borderStrong,
  },
  previewEmptyText: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.textMuted,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Theme.borderRadius.xl * 2,
    borderTopRightRadius: Theme.borderRadius.xl * 2,
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    paddingBottom: moderateScale(30),
    ...Theme.shadow.floating,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.md,
  },
  modalTitle: {
    ...Typography.heading,
    fontSize: moderateScale(17),
    color: Colors.text,
  },
  modalClose: {
    width: moderateScale(30),
    height: moderateScale(30),
    borderRadius: moderateScale(15),
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Theme.spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  modalItemText: {
    ...Typography.body,
    fontSize: moderateScale(15),
    color: Colors.textSecondary,
  },
  modalItemTextActive: {
    color: Colors.primary,
    fontFamily: 'Outfit_700Bold',
  },
});

export default ApplyLoanScreen;

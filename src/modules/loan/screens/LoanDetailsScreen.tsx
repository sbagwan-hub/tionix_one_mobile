import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppCard from '../../../components/AppCard';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { getLoanDetails, LoanDetailsResponse } from '../services/loanRequest.service';
import { downloadReport } from '../../../utils/reportDownloader';

const statusTone = {
  Pending: { color: Colors.warning, bg: 'rgba(255, 179, 0, 0.10)', icon: 'time-outline' },
  Approved: { color: Colors.success, bg: 'rgba(16, 185, 129, 0.10)', icon: 'checkmark-circle-outline' },
  Rejected: { color: Colors.error, bg: 'rgba(239, 68, 68, 0.10)', icon: 'close-circle-outline' },
};

const formatCurrency = (amount: string | number) => {
  const value = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value || 0);
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

const LoanDetailsScreen = ({ route, navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { loanId } = route.params;

  const [loan, setLoan] = useState<LoanDetailsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedInstallments, setExpandedInstallments] = useState<Record<number, boolean>>({});

  const isTablet = useMemo(() => width >= 600, [width]);

  const fetchDetails = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getLoanDetails(loanId);
      setLoan(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [loanId]);

  const toggleInstallment = (instNo: number) => {
    setExpandedInstallments((prev) => ({
      ...prev,
      [instNo]: !prev[instNo],
    }));
  };

  const handleDownloadReport = async () => {
    if (!loan) return;
    if (status !== 'Approved') {
      Alert.alert('Approval Pending', 'Your loan request is still pending HR approval. You can download the report once it is approved.');
      return;
    }
    try {
      await downloadReport(`/api/mobile/loan-requests/${loanId}/report`, `loan_${loan.loan_no}.pdf`);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to download report.');
    }
  };

  // Status mapping
  const status = useMemo(() => {
    if (!loan) return 'Pending';
    if (loan.authorize) {
      return loan.accepted === 'Accept' ? 'Approved' : 'Rejected';
    }
    if (loan.last_status === 'Rejected') {
      return 'Rejected';
    }
    return 'Pending';
  }, [loan]);

  const tone = statusTone[status] || statusTone.Pending;

  // Repayment summary calculations
  const summary = useMemo(() => {
    if (!loan || !loan.schedule) return null;
    const totalPrincipal = parseFloat(loan.loan_amount) || 0;
    let totalInterest = 0;
    let totalReturnAmount = 0;
    let totalPendingAmount = 0;
    let totalPaidAmount = 0;
    let pendingCount = 0;
    let paidCount = 0;

    for (const inst of loan.schedule) {
      const interest = parseFloat(inst.interest_amount) || 0;
      const payable = parseFloat(inst.total_payable) || 0;
      totalInterest += interest;
      totalReturnAmount += payable;

      if (inst.status === 'Pending' || !inst.status) {
        totalPendingAmount += payable;
        pendingCount++;
      } else {
        totalPaidAmount += payable;
        paidCount++;
      }
    }

    return {
      totalPrincipal,
      totalInterest,
      totalReturnAmount,
      totalPendingAmount,
      totalPaidAmount,
      pendingCount,
      paidCount,
    };
  }, [loan]);


  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading loan details...</Text>
      </View>
    );
  }

  if (error || !loan) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={moderateScale(48)} color={Colors.error} />
        <Text style={styles.errorText}>{error || 'Loan Request not found.'}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchDetails}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Header Component
  const HeaderRow = () => (
    <SafeAreaView edges={['top']} style={styles.header}>
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={moderateScale(22)} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Loan Details</Text>
        <TouchableOpacity style={styles.downloadButton} onPress={handleDownloadReport}>
          <Ionicons name="download-outline" size={moderateScale(22)} color={Colors.primary} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  // Metadata Card Component
  const LoanMetaCard = () => (
    <AppCard style={styles.metaCard}>
      {/* Title & Status */}
      <View style={styles.metaHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.metaTitle}>{loan.loan_type}</Text>
          <Text style={styles.metaSub}>{loan.loan_no}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.statusText, { color: tone.color }]}>{status}</Text>
        </View>
      </View>

      <View style={styles.metaDivider} />

      {/* Grid Fields */}
      <View style={styles.metaGrid}>
        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Employee</Text>
            <Text style={styles.metaValue}>{loan.employee_name || 'Current Employee'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Loan Amount</Text>
            <Text style={[styles.metaValue, { color: Colors.primary, fontFamily: 'Outfit_700Bold' }]}>
              {formatCurrency(loan.loan_amount)}
            </Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Interest Rate</Text>
            <Text style={styles.metaValue}>{loan.interest_rate || '0.00'} %</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Tenure</Text>
            <Text style={styles.metaValue}>{loan.installments} Months</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Voucher Number</Text>
            <Text style={styles.metaValue}>{loan.voucher_no || 'N/A'}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Deduction Start</Text>
            <Text style={styles.metaValue}>{formatMonth(loan.deduct_from_month)}</Text>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Return Through</Text>
            <Text style={styles.metaValue}>{loan.return_through}</Text>
          </View>
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Calculation Method</Text>
            <Text style={styles.metaValue}>{loan.calc_method}</Text>
          </View>
        </View>

        {loan.remarks && (
          <View style={styles.remarksRow}>
            <Text style={styles.metaLabel}>Remarks</Text>
            <Text style={styles.remarksValue}>{loan.remarks}</Text>
          </View>
        )}

        {loan.accepted && (
          <View style={[styles.remarksRow, { backgroundColor: 'rgba(0,0,0,0.01)', padding: 10, borderRadius: 8 }]}>
            <Text style={styles.metaLabel}>Approver Remarks ({loan.accepted})</Text>
            <Text style={styles.remarksValue}>{loan.a_remarks || 'No remarks provided.'}</Text>
          </View>
        )}
      </View>
    </AppCard>
  );

  // Repayment Summary Card
  const RepaymentSummaryCard = () => {
    if (!summary) return null;
    return (
      <AppCard style={styles.summaryCard}>
        <Text style={styles.summaryHeading}>Repayment Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Total Return Amount</Text>
              <Text style={[styles.summaryValue, { color: Colors.primary }]}>
                {formatCurrency(summary.totalReturnAmount)}
              </Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Total Interest</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(summary.totalInterest)}
              </Text>
            </View>
          </View>
          <View style={styles.summaryRow}>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Total Paid</Text>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>
                {formatCurrency(summary.totalPaidAmount)}
              </Text>
              <Text style={styles.summarySubLabel}>{summary.paidCount} Paid</Text>
            </View>
            <View style={styles.summaryCol}>
              <Text style={styles.summaryLabel}>Total Outstanding</Text>
              <Text style={[styles.summaryValue, { color: Colors.warning }]}>
                {formatCurrency(summary.totalPendingAmount)}
              </Text>
              <Text style={styles.summarySubLabel}>{summary.pendingCount} Pending</Text>
            </View>
          </View>
        </View>
      </AppCard>
    );
  };

  // Amortization Schedule Card List
  const AmortizationList = () => (
    <View style={styles.scheduleListContainer}>
      <Text style={styles.scheduleHeading}>Amortization Schedule</Text>
      {loan.schedule.map((inst) => {
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
                  <Text style={styles.instEmiText}>{formatCurrency(inst.total_payable)}</Text>
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
                    <Text style={styles.instDetailVal}>{formatCurrency(inst.principal_amount)}</Text>
                  </View>
                  <View style={styles.instDetailRow}>
                    <Text style={styles.instDetailLabel}>Interest Portion</Text>
                    <Text style={styles.instDetailVal}>{formatCurrency(inst.interest_amount)}</Text>
                  </View>
                  <View style={styles.instDetailRow}>
                    <Text style={styles.instDetailLabel}>Additional Interest</Text>
                    <Text style={styles.instDetailVal}>{formatCurrency(inst.add_interest_amount || '0.00')}</Text>
                  </View>
                  <View style={styles.detailDivider} />
                  <View style={styles.instDetailRow}>
                    <Text style={[styles.instDetailLabel, { fontWeight: '700', color: Colors.text }]}>
                      Total Monthly Repayment
                    </Text>
                    <Text style={[styles.instDetailVal, { fontWeight: '800', color: Colors.text }]}>
                      {formatCurrency(inst.total_payable)}
                    </Text>
                  </View>
                  <View style={styles.instDetailRow}>
                    <Text style={styles.instDetailLabel}>Outstanding Principal</Text>
                    <Text style={styles.instDetailVal}>{formatCurrency(inst.bal_principal)}</Text>
                  </View>
                </View>
              )}
            </AppCard>
          </TouchableOpacity>
        );
      })}
    </View>
  );

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

      <HeaderRow />

      {isTablet ? (
        /* Tablet Landscape Side-by-Side Split Amortization View */
        <View style={styles.tabletLayout}>
          <ScrollView style={styles.tabletLeftCol} showsVerticalScrollIndicator={false}>
            <LoanMetaCard />
            <RepaymentSummaryCard />
          </ScrollView>
          <ScrollView style={styles.tabletRightCol} showsVerticalScrollIndicator={false}>
            <AmortizationList />
          </ScrollView>
        </View>
      ) : (
        /* Mobile Portrait Vertical Stack Amortization View */
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + moderateScale(40) }]}
        >
          <LoanMetaCard />
          <RepaymentSummaryCard />
          <AmortizationList />
        </ScrollView>
      )}
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
  downloadButton: {
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
  metaCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0,
    ...Theme.shadow.md,
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  metaSub: {
    ...Typography.caption,
    fontSize: moderateScale(12),
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    borderRadius: Theme.borderRadius.pill,
  },
  statusText: {
    ...Typography.label,
    fontSize: moderateScale(10),
    fontWeight: '800',
  },
  metaDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Theme.spacing.md,
  },
  metaGrid: {
    gap: Theme.spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    ...Typography.caption,
    fontSize: moderateScale(11),
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  metaValue: {
    ...Typography.body,
    fontSize: moderateScale(14),
    fontFamily: 'Outfit_600SemiBold',
    color: Colors.text,
    marginTop: 2,
  },
  remarksRow: {
    gap: 4,
    marginTop: 4,
  },
  remarksValue: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    lineHeight: moderateScale(18),
  },
  scheduleListContainer: {
    gap: Theme.spacing.sm,
  },
  scheduleHeading: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
    marginLeft: 4,
    marginBottom: 4,
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
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    backgroundColor: Colors.white,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xl,
    gap: Theme.spacing.md,
    backgroundColor: Colors.white,
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
  tabletLayout: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.lg,
  },
  tabletLeftCol: {
    flex: 4,
  },
  tabletRightCol: {
    flex: 6,
  },
  summaryCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0,
    ...Theme.shadow.md,
    marginTop: Theme.spacing.md,
  },
  summaryHeading: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
    marginBottom: Theme.spacing.md,
  },
  summaryGrid: {
    gap: Theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryCol: {
    flex: 1,
  },
  summaryLabel: {
    ...Typography.caption,
    fontSize: moderateScale(11),
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  summaryValue: {
    ...Typography.body,
    fontSize: moderateScale(16),
    fontFamily: 'Outfit_700Bold',
    color: Colors.text,
    marginTop: 2,
  },
  summarySubLabel: {
    ...Typography.caption,
    fontSize: moderateScale(10),
    color: Colors.textMuted,
    marginTop: 1,
  },
});

export default LoanDetailsScreen;

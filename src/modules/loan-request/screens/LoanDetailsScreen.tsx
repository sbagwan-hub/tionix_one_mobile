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
import AppBar from '../../../components/AppBar';
import AppCard from '../../../components/AppCard';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { getLoanDetails, LoanDetailsResponse } from '../services/loan-request.service';
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

  // Grid col helper component
  const MetaGridCol = ({ icon, label, value, color }: { icon: string; label: string; value: string; color?: string }) => (
    <View style={styles.metaGridColContainer}>
      <View style={styles.metaColIconWrapper}>
        <Ionicons name={icon as any} size={moderateScale(16)} color={color || Colors.textSecondary} />
      </View>
      <View style={styles.metaColTextWrapper}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
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

      <LinearGradient
        colors={['rgba(255, 77, 28, 0.08)', 'rgba(255, 77, 28, 0.02)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.metaHeroContainer}
      >
        <Text style={styles.metaHeroLabel}>LOAN AMOUNT APPROVED</Text>
        <Text style={styles.metaHeroAmount}>{formatCurrency(loan.loan_amount)}</Text>
      </LinearGradient>

      {/* Grid Fields */}
      <View style={styles.metaGrid}>
        <View style={styles.metaRow}>
          <MetaGridCol icon="person-outline" label="Employee" value={loan.employee_name || 'Current Employee'} />
          <MetaGridCol icon="trending-up-outline" label="Interest Rate" value={`${loan.interest_rate || '0.00'} %`} />
        </View>

        <View style={styles.metaRow}>
          <MetaGridCol icon="calendar-outline" label="Tenure" value={`${loan.installments} Months`} />
          <MetaGridCol icon="receipt-outline" label="Voucher Number" value={loan.voucher_no || 'N/A'} />
        </View>

        <View style={styles.metaRow}>
          <MetaGridCol icon="time-outline" label="Deduction Start" value={formatMonth(loan.deduct_from_month)} />
          <MetaGridCol icon="wallet-outline" label="Return Through" value={loan.return_through} />
        </View>

        <View style={styles.metaRow}>
          <MetaGridCol icon="calculator-outline" label="Calculation Method" value={loan.calc_method} />
          <View style={{ flex: 1 }} />
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
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryHeading}>Repayment Summary</Text>
        
        {/* Main Card (Payable & Interest) */}
        <AppCard style={styles.summaryMainCard}>
          <View style={styles.summaryMainRow}>
            <View style={{ flex: 1.2 }}>
              <Text style={styles.summaryCardLabel}>TOTAL PAYABLE</Text>
              <Text style={[styles.summaryCardValue, { color: Colors.primary, fontSize: moderateScale(18) }]}>
                {formatCurrency(summary.totalReturnAmount)}
              </Text>
            </View>
            <View style={styles.summaryMainDivider} />
            <View style={{ flex: 1, paddingLeft: moderateScale(16) }}>
              <Text style={styles.summaryCardLabel}>TOTAL INTEREST</Text>
              <Text style={[styles.summaryCardValue, { fontSize: moderateScale(16) }]}>
                {formatCurrency(summary.totalInterest)}
              </Text>
            </View>
          </View>
        </AppCard>

        {/* Paid & Outstanding Cards Grid */}
        <View style={styles.summaryGridRow}>
          <View style={[styles.summaryStatusCard, styles.summaryPaidCard]}>
            <View style={styles.summaryStatusIconRow}>
              <Ionicons name="checkmark-circle" size={moderateScale(18)} color={Colors.success} />
              <Text style={[styles.summaryStatusLabel, { color: Colors.success }]}>PAID</Text>
            </View>
            <Text style={[styles.summaryStatusAmount, { color: '#0F5132' }]}>
              {formatCurrency(summary.totalPaidAmount)}
            </Text>
            <Text style={styles.summaryStatusSubText}>{summary.paidCount} Paid</Text>
          </View>

          <View style={[styles.summaryStatusCard, styles.summaryPendingCard]}>
            <View style={styles.summaryStatusIconRow}>
              <Ionicons name="time" size={moderateScale(18)} color={Colors.warning} />
              <Text style={[styles.summaryStatusLabel, { color: Colors.warning }]}>OUTSTANDING</Text>
            </View>
            <Text style={[styles.summaryStatusAmount, { color: '#664D03' }]}>
              {formatCurrency(summary.totalPendingAmount)}
            </Text>
            <Text style={styles.summaryStatusSubText}>{summary.pendingCount} Pending</Text>
          </View>
        </View>
      </View>
    );
  };

  // Amortization Schedule Card List
  const AmortizationList = () => (
    <View style={styles.scheduleListContainer}>
      <Text style={styles.scheduleHeading}>Amortization Schedule</Text>
      {loan.schedule.map((inst) => {
        const isExpanded = !!expandedInstallments[inst.inst_no];
        const isPaid = inst.status !== 'Pending' && !!inst.status;
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
                  <View style={[styles.instStatusBadge, { backgroundColor: isPaid ? 'rgba(16, 185, 129, 0.08)' : 'rgba(142, 142, 147, 0.08)' }]}>
                    <Text style={[styles.instStatusBadgeText, { color: isPaid ? Colors.success : Colors.textMuted }]}>
                      {isPaid ? 'PAID' : 'PENDING'}
                    </Text>
                  </View>
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
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      {/* Custom AppBar */}
      <AppBar title="Loan Details" showBackButton onBackPress={() => navigation.goBack()} />

      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.15)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

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
    zIndex: -1,
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
  metaHeroContainer: {
    borderRadius: moderateScale(16),
    paddingVertical: moderateScale(16),
    paddingHorizontal: moderateScale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: moderateScale(12),
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 28, 0.1)',
  },
  metaHeroLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    color: Colors.primary,
    letterSpacing: 1.2,
  },
  metaHeroAmount: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: moderateScale(28),
    color: Colors.text,
    marginTop: moderateScale(4),
  },
  metaDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: Theme.spacing.md,
  },
  metaGrid: {
    gap: Theme.spacing.md,
  },
  metaGridColContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(10),
  },
  metaColIconWrapper: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(8),
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  metaColTextWrapper: {
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Theme.spacing.sm,
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
    fontSize: moderateScale(13),
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
  instStatusBadge: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(6),
  },
  instStatusBadgeText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(8),
    letterSpacing: 0.3,
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
    marginTop: Theme.spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: Theme.spacing.sm,
    paddingHorizontal: moderateScale(8),
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: moderateScale(8),
    paddingVertical: moderateScale(10),
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
  summaryContainer: {
    gap: Theme.spacing.sm,
    marginTop: Theme.spacing.xs,
  },
  summaryMainCard: {
    padding: moderateScale(16),
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    ...Theme.shadow.sm,
  },
  summaryMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryMainDivider: {
    width: 1,
    height: '100%',
    backgroundColor: '#E2E8F0',
  },
  summaryCardLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(10),
    color: Colors.textMuted,
    letterSpacing: 0.8,
  },
  summaryCardValue: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.text,
    marginTop: 4,
  },
  summaryGridRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  summaryStatusCard: {
    flex: 1,
    borderRadius: Theme.borderRadius.xl,
    padding: moderateScale(14),
    borderWidth: 1,
    ...Theme.shadow.sm,
  },
  summaryPaidCard: {
    backgroundColor: '#F0FDF4',
    borderColor: 'rgba(16, 185, 129, 0.15)',
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryPendingCard: {
    backgroundColor: '#FFFDF5',
    borderColor: 'rgba(245, 158, 11, 0.15)',
    shadowColor: Colors.warning,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  summaryStatusIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(6),
  },
  summaryStatusLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    letterSpacing: 0.6,
  },
  summaryStatusAmount: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(15),
    marginTop: moderateScale(8),
  },
  summaryStatusSubText: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(10),
    color: Colors.textMuted,
    marginTop: 2,
  },
  summaryHeading: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
    marginBottom: Theme.spacing.xs,
  },
});

export default LoanDetailsScreen;

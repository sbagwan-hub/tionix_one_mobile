import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
  Image,
} from 'react-native';
import { downloadReport } from '../../../utils/reportDownloader';
import Shimmer from '../../../components/Shimmer';
import AppBar from '../../../components/AppBar';
import { getAuthSession } from '../../auth/services/auth';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppCard from '../../../components/AppCard';
import { Colors, Theme } from '../../../theme/colors';
import { Typography } from '../../../theme/typography';
import { moderateScale } from '../../../utils/responsive';
import { getLoans, NormalizedLoan } from '../services/loan';
import { useFocusEffect } from '@react-navigation/native';

const statusTone = {
  Pending: { color: Colors.warning, bg: 'rgba(255, 179, 0, 0.10)', icon: 'time-outline' },
  Approved: { color: Colors.success, bg: 'rgba(16, 185, 129, 0.10)', icon: 'checkmark-circle-outline' },
  Rejected: { color: Colors.error, bg: 'rgba(239, 68, 68, 0.10)', icon: 'close-circle-outline' },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatMonth = (value: string) => {
  try {
    const [year, month] = value.split('-');
    const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return value;
  }
};

const MyLoansScreen = ({ navigation, route }: any) => {
  const insets = useSafeAreaInsets();
  const [loans, setLoans] = useState<NormalizedLoan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownloadReport = async () => {
    try {
      const session = await getAuthSession();
      const empId = session?.user?.fkEmpId;
      if (!empId) {
        Alert.alert('Error', 'Employee ID not found in session.');
        return;
      }
      await downloadReport('/api/mobile/loan-requests/report', 'loans_report.pdf', empId);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to download report.');
    }
  };

  const fetchLoans = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError(null);

    try {
      const data = await getLoans();
      setLoans(data);
    } catch (err) {
      console.error('Error fetching loans:', err);
      setError(err instanceof Error ? err.message : 'Unable to connect to the server.');
      // Set empty loans array to allow UI to render
      setLoans([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (route?.params?.refresh) {
        fetchLoans();
      } else {
        fetchLoans();
      }
    }, [fetchLoans, route?.params?.refresh])
  );

  const currentYear = useMemo(() => new Date().getFullYear(), []);

  const stats = useMemo(() => {
    const pending = loans.filter((item) => item.status === 'Pending').length;
    const approvedCount = loans.filter((item) => item.status === 'Approved').length;
    const approvedSum = loans
      .filter((item) => item.status === 'Approved')
      .reduce((sum, item) => sum + item.loanAmount, 0);

    return {
      pending: String(pending).padStart(2, '0'),
      approvedCount: String(approvedCount).padStart(2, '0'),
      totalApprovedAmount: approvedSum,
    };
  }, [loans]);

  const debtSummary = useMemo(() => {
    const approvedLoans = loans.filter((item) => item.status === 'Approved');
    const totalDebt = approvedLoans.reduce((sum, item) => sum + item.loanAmount, 0);
    const availableLimit = 25000 - totalDebt;
    
    // Find next repayment date from approved loans
    let nextRepayment = 'N/A';
    const today = new Date();
    for (const loan of approvedLoans) {
      try {
        const [year, month] = loan.deductFromMonth.split('-');
        const loanDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        if (loanDate > today) {
          nextRepayment = loanDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          break;
        }
      } catch {}
    }

    return {
      totalDebt,
      availableLimit: Math.max(0, availableLimit),
      nextRepayment,
    };
  }, [loans]);

  const currentLoans = useMemo(() => {
    // Show all loans (Pending and Approved) so newly applied loans are visible
    const allLoans = loans.filter((item) => item.status === 'Approved' || item.status === 'Pending');
    return allLoans.map((loan) => {
      const paidPercentage = loan.status === 'Approved' ? Math.round(Math.random() * 80) + 10 : 0;
      const remaining = loan.loanAmount * (1 - paidPercentage / 100);
      return {
        ...loan,
        paidPercentage,
        remaining,
        loanNo: loan.loanNo,
      };
    });
  }, [loans]);

  const upcomingRepayments = useMemo(() => {
    const approvedLoans = loans.filter((item) => item.status === 'Approved');
    const today = new Date();
    return approvedLoans.slice(0, 2).map((loan, index) => {
      try {
        const [year, month] = loan.deductFromMonth.split('-');
        const loanDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        const emi = loan.loanAmount / loan.installments;
        return {
          id: loan.id,
          loanType: 'Monthly Installment',
          subtitle: loan.loanType,
          dateMonth: loanDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
          dateDay: loanDate.toLocaleDateString('en-US', { day: '2-digit' }),
          amount: emi,
          status: index === 0 ? 'AUTO-PAY' : 'PENDING',
        };
      } catch {
        return null;
      }
    }).filter(Boolean);
  }, [loans]);

  const statCards = useMemo(
    () => [
      {
        label: 'Pending',
        value: stats.pending,
        icon: 'time-outline',
        tone: Colors.warning,
      },
      {
        label: 'Approved',
        value: stats.approvedCount,
        icon: 'checkmark-circle-outline',
        tone: Colors.success,
      },
    ],
    [stats]
  );

  const openApplyLoan = () => {
    navigation.navigate('ApplyLoan');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Custom AppBar */}
      <AppBar title="My Loans" />

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: moderateScale(100) + insets.bottom }]}>
          {/* Total Active Debt Shimmer */}
          <AppCard style={styles.debtCard}>
            <Shimmer width={40} height={40} borderRadius={10} />
            <View style={styles.debtContent}>
              <Shimmer width="40%" height={12} borderRadius={3} />
              <Shimmer width="50%" height={24} borderRadius={4} style={{ marginTop: 4 }} />
              <View style={styles.debtDetails}>
                <Shimmer width="40%" height={10} borderRadius={2} />
                <Shimmer width="30%" height={10} borderRadius={2} />
              </View>
            </View>
          </AppCard>

          {/* Current Loans Shimmer */}
          <Text style={styles.sectionTitle}>Current Loans</Text>
          {[1, 2].map(i => (
            <AppCard key={i} style={styles.loanCard}>
              <View style={styles.loanCardHeader}>
                <Shimmer width="40%" height={16} borderRadius={4} />
                <Shimmer width={80} height={14} borderRadius={3} />
              </View>
              <View style={styles.progressContainer}>
                <Shimmer width="100%" height={8} borderRadius={4} />
              </View>
              <Shimmer width="30%" height={12} borderRadius={3} style={{ marginTop: 8 }} />
            </AppCard>
          ))}

          {/* Upcoming Repayments Shimmer */}
          <Text style={styles.sectionTitle}>Upcoming Repayments</Text>
          {[1, 2].map(i => (
            <AppCard key={i} style={styles.repaymentCard}>
              <View style={styles.repaymentLeft}>
                <Shimmer width="40%" height={14} borderRadius={3} />
                <Shimmer width="30%" height={12} borderRadius={3} style={{ marginTop: 4 }} />
              </View>
              <View style={styles.repaymentRight}>
                <Shimmer width={60} height={18} borderRadius={4} />
                <Shimmer width={50} height={10} borderRadius={3} style={{ marginTop: 4 }} />
              </View>
            </AppCard>
          ))}

          {/* Health Score Shimmer */}
          <AppCard style={styles.healthCard}>
            <Shimmer width="30%" height={14} borderRadius={3} />
            <Shimmer width={60} height={32} borderRadius={4} style={{ marginTop: 8 }} />
            <Shimmer width="70%" height={12} borderRadius={3} style={{ marginTop: 4 }} />
          </AppCard>
        </ScrollView>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={moderateScale(48)} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchLoans()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : loans.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="card-outline" size={moderateScale(40)} color={Colors.borderStrong} />
          <Text style={styles.emptyText}>No loans found yet.</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={openApplyLoan} activeOpacity={0.85}>
            <Text style={styles.emptyButtonText}>Apply for loan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: moderateScale(100) + insets.bottom },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => fetchLoans(true)}
                colors={[Colors.primary]}
                tintColor={Colors.primary}
              />
            }
          >
            {/* Total Active Debt Card */}
            <AppCard style={styles.debtCard}>
              <View style={styles.debtIcon}>
                <Ionicons name="card-outline" size={moderateScale(24)} color={Colors.primary} />
              </View>
              <View style={styles.debtContent}>
                <Text style={styles.debtLabel}>Total Active Debt</Text>
                <Text style={styles.debtAmount}>{formatCurrency(debtSummary.totalDebt)}</Text>
                <View style={styles.debtDetails}>
                  <Text style={styles.debtDetail}>Available: {formatCurrency(debtSummary.availableLimit)}</Text>
                  <Text style={styles.debtDetail}>Next: {debtSummary.nextRepayment}</Text>
                </View>
              </View>
            </AppCard>

            {/* Current Loans Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Current Loans</Text>
              <TouchableOpacity onPress={() => {}}>
                <Text style={styles.seeHistoryText}>See History</Text>
              </TouchableOpacity>
            </View>
            {currentLoans.length === 0 ? (
              <AppCard style={styles.emptyCard}>
                <Ionicons name="card-outline" size={moderateScale(40)} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No Current Loans</Text>
                <Text style={styles.emptySubtitle}>You don't have any active loans at the moment.</Text>
              </AppCard>
            ) : (
              currentLoans.map((loan: any) => (
                <TouchableOpacity
                  key={loan.id || loan.pk_lr_id}
                  activeOpacity={0.85}
                  onPress={() => loan.id && typeof loan.id === 'string' && loan.id.startsWith('mock-') ? {} : navigation.navigate('LoanDetails', { loanId: loan.id || loan.pk_lr_id })}
                >
                  <AppCard style={styles.loanCard}>
                    <View style={styles.loanCardTop}>
                      <View style={[styles.loanIconContainer, { backgroundColor: loan.loanType === 'Asset Purchase' ? 'rgba(0, 102, 255, 0.08)' : 'rgba(255, 77, 28, 0.08)' }]}>
                        <Ionicons
                          name={loan.loanType === 'Asset Purchase' ? 'car-outline' : 'person-outline'}
                          size={moderateScale(20)}
                          color={loan.loanType === 'Asset Purchase' ? '#0066FF' : Colors.primary}
                        />
                      </View>
                      <View style={styles.loanMetaContainer}>
                        <Text style={styles.loanTitle}>{loan.loanType}</Text>
                        <Text style={styles.loanNoText}>{loan.loanNo}</Text>
                      </View>
                      <View style={styles.loanAmountContainer}>
                        <Text style={styles.loanRemainingText}>{formatCurrency(loan.remaining)}</Text>
                        <Text style={styles.loanAmountLabel}>REMAINING</Text>
                      </View>
                    </View>
                    <View style={styles.loanProgressRow}>
                      <Text style={styles.progressLabel}>Progress</Text>
                      <Text style={[styles.progressPercentageText, { color: loan.loanType === 'Asset Purchase' ? '#0066FF' : Colors.primary }]}>
                        {loan.paidPercentage}% Paid
                      </Text>
                    </View>
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBackground}>
                        <View style={[styles.progressFill, { width: `${loan.paidPercentage}%`, backgroundColor: loan.loanType === 'Asset Purchase' ? '#0066FF' : Colors.primary }]} />
                      </View>
                    </View>
                  </AppCard>
                </TouchableOpacity>
              ))
            )}

            {/* Upcoming Repayments Section */}
            <Text style={styles.sectionTitle}>Upcoming Repayments</Text>
            {upcomingRepayments.length === 0 ? (
              <AppCard style={styles.emptyCard}>
                <Ionicons name="calendar-outline" size={moderateScale(40)} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No Upcoming Repayments</Text>
                <Text style={styles.emptySubtitle}>You have no scheduled repayments at this time.</Text>
              </AppCard>
            ) : (
              upcomingRepayments.map((repayment: any) => (
                <AppCard key={repayment.id} style={styles.repaymentCard}>
                  <View style={[styles.dateBox, { backgroundColor: repayment.status === 'AUTO-PAY' ? 'rgba(255, 77, 28, 0.05)' : 'rgba(142, 142, 147, 0.08)' }]}>
                    <Text style={[styles.dateMonthText, { color: repayment.status === 'AUTO-PAY' ? Colors.primary : Colors.textMuted }]}>{repayment.dateMonth}</Text>
                    <Text style={styles.dateDayText}>{repayment.dateDay}</Text>
                  </View>
                  <View style={styles.repaymentMiddle}>
                    <Text style={styles.repaymentTitle}>{repayment.loanType}</Text>
                    <Text style={styles.repaymentSubtitle}>{repayment.subtitle}</Text>
                  </View>
                  <View style={styles.repaymentRight}>
                    <Text style={[styles.repaymentAmount, { color: repayment.status === 'AUTO-PAY' ? Colors.primary : Colors.text }]}>{formatCurrency(repayment.amount)}</Text>
                    <Text style={[styles.repaymentStatusText, { color: repayment.status === 'AUTO-PAY' ? Colors.primary : Colors.textMuted }]}>
                      ✦ {repayment.status}
                    </Text>
                  </View>
                </AppCard>
              ))
            )}

            {/* Health Score Card */}
            {loans.length > 0 && (
              <AppCard style={styles.healthCard}>
                <Text style={styles.healthLabel}>Health Score</Text>
                <Text style={styles.healthScore}>{stats.totalApprovedAmount > 0 ? '750' : 'N/A'}</Text>
                <Text style={styles.healthStatus}>
                  {stats.totalApprovedAmount > 0 
                    ? 'Good - Keep up with your repayments' 
                    : 'No active loans to track'}
                </Text>
              </AppCard>
            )}
          </ScrollView>
        </View>
      )}

      {/* Floating Action Button (FAB) - Apply Loan */}
      <TouchableOpacity
        style={[styles.fabButton, { bottom: moderateScale(24) }]}
        activeOpacity={0.85}
        onPress={openApplyLoan}
      >
        <Ionicons name="add" size={moderateScale(28)} color={Colors.white} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    paddingBottom: Theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.lg,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  downloadButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: Colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  exclusiveCard: {
    borderRadius: Theme.borderRadius.xxl,
    overflow: 'hidden',
    ...Theme.shadow.floating,
    marginBottom: Theme.spacing.md,
  },
  exclusiveGradient: {
    padding: Theme.spacing.lg,
    position: 'relative',
  },
  exclusiveTag: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(4),
    borderRadius: Theme.borderRadius.pill,
    marginBottom: Theme.spacing.sm,
  },
  exclusiveTagText: {
    ...Typography.label,
    fontSize: moderateScale(10),
    color: Colors.white,
    fontWeight: '700',
    letterSpacing: 1,
  },
  exclusiveContent: {
    flex: 1,
  },
  exclusiveTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.white,
    marginBottom: moderateScale(4),
  },
  exclusiveSubtitle: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.9)',
  },
  exclusiveIcon: {
    position: 'absolute',
    right: Theme.spacing.lg,
    top: '50%',
    marginTop: -moderateScale(16),
  },
  debtCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0,
    ...Theme.shadow.md,
  },
  debtIcon: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  debtContent: {
    flex: 1,
  },
  debtLabel: {
    ...Typography.label,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
    marginBottom: moderateScale(2),
  },
  debtAmount: {
    ...Typography.heading,
    fontSize: moderateScale(24),
    color: Colors.text,
    fontFamily: 'Outfit_700Bold',
  },
  debtDetails: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: moderateScale(4),
  },
  debtDetail: {
    ...Typography.caption,
    fontSize: moderateScale(11),
    color: Colors.textMuted,
  },
  emptyCard: {
    padding: Theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0,
    ...Theme.shadow.md,
  },
  emptyTitle: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
    marginTop: Theme.spacing.md,
    fontFamily: 'Outfit_600SemiBold',
  },
  emptySubtitle: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    marginTop: Theme.spacing.xs,
    textAlign: 'center',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  seeHistoryText: {
    ...Typography.label,
    color: Colors.primary,
    fontSize: moderateScale(12),
    fontFamily: 'Outfit_600SemiBold',
  },
  loanCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loanIconContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.sm,
  },
  loanMetaContainer: {
    flex: 1,
  },
  loanNoText: {
    ...Typography.caption,
    fontSize: moderateScale(11),
    color: Colors.textMuted,
    marginTop: moderateScale(2),
  },
  loanAmountContainer: {
    alignItems: 'flex-end',
  },
  loanRemainingText: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
    fontFamily: 'Outfit_700Bold',
  },
  loanAmountLabel: {
    ...Typography.caption,
    fontSize: moderateScale(9),
    color: Colors.textMuted,
    marginTop: moderateScale(2),
  },
  loanProgressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Theme.spacing.md,
  },
  progressLabel: {
    ...Typography.caption,
    fontSize: moderateScale(11),
    color: Colors.textMuted,
  },
  progressPercentageText: {
    ...Typography.caption,
    fontSize: moderateScale(11),
    fontFamily: 'Outfit_700Bold',
  },
  dateBox: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.sm,
  },
  dateMonthText: {
    ...Typography.caption,
    fontSize: moderateScale(10),
    fontWeight: '700',
  },
  dateDayText: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
    fontFamily: 'Outfit_700Bold',
    marginTop: moderateScale(1),
  },
  repaymentMiddle: {
    flex: 1,
  },
  repaymentSubtitle: {
    ...Typography.caption,
    fontSize: moderateScale(12),
    color: Colors.textMuted,
    marginTop: moderateScale(2),
  },
  sectionTitle: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  loanCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0,
    ...Theme.shadow.md,
  },
  loanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  loanTitle: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    color: Colors.text,
    fontFamily: 'Outfit_600SemiBold',
  },
  loanRemaining: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.primary,
    fontFamily: 'Outfit_600SemiBold',
  },
  progressContainer: {
    marginVertical: Theme.spacing.sm,
  },
  progressBackground: {
    height: moderateScale(8),
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.borderRadius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Theme.borderRadius.pill,
  },
  loanPaid: {
    ...Typography.caption,
    fontSize: moderateScale(11),
    color: Colors.textMuted,
  },
  repaymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0,
    ...Theme.shadow.md,
  },
  repaymentLeft: {
    flex: 1,
  },
  repaymentTitle: {
    ...Typography.heading,
    fontSize: moderateScale(14),
    color: Colors.text,
    fontFamily: 'Outfit_600SemiBold',
  },
  repaymentDate: {
    ...Typography.caption,
    fontSize: moderateScale(12),
    color: Colors.textMuted,
    marginTop: moderateScale(2),
  },
  repaymentRight: {
    alignItems: 'flex-end',
  },
  repaymentAmount: {
    ...Typography.heading,
    fontSize: moderateScale(16),
    color: Colors.text,
    fontFamily: 'Outfit_700Bold',
  },
  repaymentStatus: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: Theme.borderRadius.sm,
    marginTop: moderateScale(4),
  },
  repaymentStatusText: {
    ...Typography.label,
    fontSize: moderateScale(9),
    fontWeight: '700',
  },
  healthCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0,
    ...Theme.shadow.md,
  },
  healthLabel: {
    ...Typography.label,
    fontSize: moderateScale(12),
    color: Colors.textSecondary,
  },
  healthScore: {
    ...Typography.heading,
    fontSize: moderateScale(32),
    color: Colors.success,
    fontFamily: 'Outfit_700Bold',
    marginTop: moderateScale(4),
  },
  healthStatus: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    marginTop: moderateScale(4),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Theme.spacing.sm,
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xxl,
    gap: Theme.spacing.sm,
  },
  emptyText: {
    ...Typography.body,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: moderateScale(10),
    borderRadius: Theme.borderRadius.pill,
    backgroundColor: 'rgba(255, 77, 28, 0.10)',
  },
  emptyButtonText: {
    ...Typography.subheading,
    color: Colors.primary,
    fontSize: moderateScale(13),
  },
  fabButton: {
    position: 'absolute',
    right: Theme.spacing.lg,
    width: moderateScale(56),
    height: moderateScale(56),
    borderRadius: moderateScale(28),
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    ...Theme.shadow.floating,
    shadowColor: Colors.primary,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 8,
  },
});

export default MyLoansScreen;

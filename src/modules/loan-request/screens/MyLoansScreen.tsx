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
  Modal,
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
  Pending: { color: Colors.warning, bg: 'rgba(255, 179, 0, 0.08)', icon: 'time-outline' },
  Approved: { color: Colors.success, bg: 'rgba(16, 185, 129, 0.08)', icon: 'checkmark-circle-outline' },
  Rejected: { color: Colors.error, bg: 'rgba(239, 68, 68, 0.08)', icon: 'close-circle-outline' },
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (value: string) => {
  try {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return value;
  }
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
  const [historyVisible, setHistoryVisible] = useState(false);

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
      setLoans([]);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchLoans();
    }, [fetchLoans])
  );

  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      const unsubscribe = parent.addListener('focus', () => {
        fetchLoans(true);
      });
      return unsubscribe;
    }
  }, [navigation, fetchLoans]);

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
    
    let nextRepayment = 'N/A';
    const today = new Date();
    for (const loan of approvedLoans) {
      try {
        const [year, month] = loan.deductFromMonth.split('-');
        const loanDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
        if (loanDate > today) {
          nextRepayment = loanDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
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

  const openApplyLoan = () => {
    navigation.navigate('ApplyLoan');
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

      {/* Custom AppBar */}
      <AppBar title="My Loans" />

      {/* Background Gradients */}
      <View style={styles.bannerContainer}>
        <LinearGradient
          colors={['rgba(255, 77, 28, 0.12)', 'rgba(255, 77, 28, 0.0)']}
          style={styles.bannerGradient}
        />
        <View style={styles.bannerBlurOrb1} />
        <View style={styles.bannerBlurOrb2} />
      </View>

      {isLoading ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: moderateScale(100) + insets.bottom }]}>

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

            {/* Current Loans Section */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Current Loans</Text>
              <View style={styles.sectionActionsRow}>
                <TouchableOpacity onPress={() => setHistoryVisible(true)} activeOpacity={0.8} style={styles.seeHistoryContainer}>
                  <Ionicons name="time-outline" size={moderateScale(12)} color={Colors.primary} />
                  <Text style={styles.seeHistoryText}>History</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={openApplyLoan} activeOpacity={0.9}>
                  <LinearGradient
                    colors={Colors.primaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.sectionActionContainer}
                  >
                    <Ionicons name="add" size={moderateScale(12)} color={Colors.white} />
                    <Text style={styles.sectionAction}>APPLY LOAN</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>

            {currentLoans.length === 0 ? (
              <AppCard style={styles.emptyCard}>
                <Ionicons name="card-outline" size={moderateScale(40)} color={Colors.textMuted} />
                <Text style={styles.emptyTitle}>No Current Loans</Text>
                <Text style={styles.emptySubtitle}>You don't have any active loans at the moment.</Text>
              </AppCard>
            ) : (
              currentLoans.map((loan: any) => {
                const tone = statusTone[loan.status as 'Pending' | 'Approved' | 'Rejected'] || { color: Colors.textSecondary };
                const isAsset = loan.loanType === 'Asset Purchase';
                return (
                  <TouchableOpacity
                    key={loan.id || loan.pk_lr_id}
                    activeOpacity={0.85}
                    onPress={() => loan.id && typeof loan.id === 'string' && loan.id.startsWith('mock-') ? {} : navigation.navigate('LoanDetails', { loanId: loan.id || loan.pk_lr_id })}
                  >
                    <AppCard style={[styles.loanCard, { borderLeftWidth: moderateScale(4), borderLeftColor: tone.color }]}>
                      <View style={styles.loanCardTop}>
                        <LinearGradient
                          colors={isAsset ? ['#3B82F6', '#1D4ED8'] as const : ['#FFA040', '#FF4D1C'] as const}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.loanIconGradientContainer}
                        >
                          <Ionicons
                            name={isAsset ? 'car-outline' : 'person-outline'}
                            size={moderateScale(18)}
                            color={Colors.white}
                          />
                        </LinearGradient>
                        <View style={styles.loanMetaContainer}>
                          <Text style={styles.loanTitle}>{loan.loanType}</Text>
                          <Text style={styles.loanNoText}>{loan.loanNo}</Text>
                        </View>
                        <View style={styles.loanAmountContainer}>
                          <Text style={styles.loanRemainingText}>{formatCurrency(loan.remaining)}</Text>
                          <Text style={styles.loanAmountLabel}>REMAINING</Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={moderateScale(16)}
                          color={Colors.textMuted}
                          style={styles.loanChevron}
                        />
                      </View>
                      <View style={styles.loanProgressRow}>
                        <Text style={styles.progressLabel}>Progress</Text>
                        <Text style={[styles.progressPercentageText, { color: isAsset ? '#3B82F6' : '#FF4D1C' }]}>
                          {loan.paidPercentage}% Paid
                        </Text>
                      </View>
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBackground}>
                          <View style={[
                            styles.progressFill,
                            {
                              width: `${loan.paidPercentage}%`,
                              backgroundColor: isAsset ? '#3B82F6' : '#FF4D1C'
                            }
                          ]} />
                        </View>
                      </View>
                    </AppCard>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Upcoming Repayments Section */}
            <Text style={styles.sectionTitle}>Upcoming Repayments</Text>
            {upcomingRepayments.length === 0 ? (
              <View style={styles.repaymentsWidgetEmpty}>
                <View style={styles.repaymentsWidgetEmptyIconContainer}>
                  <Ionicons name="calendar-outline" size={moderateScale(24)} color="#94A3B8" />
                </View>
                <Text style={styles.repaymentsWidgetEmptyTitle}>No Upcoming Repayments</Text>
                <Text style={styles.repaymentsWidgetEmptySubtitle}>You have no scheduled repayments at this time.</Text>
              </View>
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
          </ScrollView>
        </View>
      )}



      {/* Loan History Bottom Sheet Modal */}
      <Modal
        visible={historyVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setHistoryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalDismissArea} 
            activeOpacity={1} 
            onPress={() => setHistoryVisible(false)} 
          />
          <View style={styles.modalContentContainer}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderTitleRow}>
                <Ionicons name="time-outline" size={moderateScale(20)} color={Colors.primary} />
                <Text style={styles.modalTitleText}>Loan Request History</Text>
              </View>
              <TouchableOpacity 
                onPress={() => setHistoryVisible(false)}
                style={styles.modalCloseBtn}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={moderateScale(22)} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {loans.length === 0 ? (
                <View style={styles.modalEmptyState}>
                  <Ionicons name="card-outline" size={moderateScale(40)} color={Colors.textMuted} />
                  <Text style={styles.modalEmptyTitle}>No History Available</Text>
                </View>
              ) : (
                loans.map((loan) => {
                  const status = loan.status;
                  const tone = statusTone[status] || { color: Colors.textSecondary, bg: 'rgba(148, 163, 184, 0.08)', icon: 'ban-outline' };
                  const isAsset = loan.loanType === 'Asset Purchase';
                  
                  return (
                    <TouchableOpacity
                      key={loan.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        setHistoryVisible(false);
                        if (loan.id && typeof loan.id === 'string' && loan.id.startsWith('mock-')) return;
                        navigation.navigate('LoanDetails', { loanId: loan.id });
                      }}
                      style={[styles.historyItemCard, { borderLeftColor: tone.color, borderLeftWidth: moderateScale(4) }]}
                    >
                      <View style={styles.historyItemMain}>
                        <View style={[styles.loanIconContainer, { backgroundColor: isAsset ? 'rgba(0, 102, 255, 0.08)' : 'rgba(255, 77, 28, 0.08)', width: moderateScale(36), height: moderateScale(36), marginRight: moderateScale(10) }]}>
                          <Ionicons
                            name={isAsset ? 'car-outline' : 'person-outline'}
                            size={moderateScale(18)}
                            color={isAsset ? '#0066FF' : Colors.primary}
                          />
                        </View>
                        <View style={styles.historyItemMeta}>
                          <Text style={styles.historyItemType}>{loan.loanType}</Text>
                          <Text style={styles.historyItemNo}>{loan.loanNo}</Text>
                          <Text style={styles.historyItemDate}>Applied: {formatDate(loan.appliedOn || loan.loanDate)}</Text>
                        </View>
                        <View style={styles.historyItemRight}>
                          <Text style={styles.historyItemAmount}>{formatCurrency(loan.loanAmount)}</Text>
                          <View style={[styles.statusPill, { backgroundColor: tone.bg, paddingHorizontal: moderateScale(8), paddingVertical: moderateScale(2), marginTop: moderateScale(4) }]}>
                            <Text style={[styles.logStatus, { color: tone.color, fontSize: moderateScale(8) }]}>{status.toUpperCase()}</Text>
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={moderateScale(14)} color={Colors.textMuted} style={styles.chevron} />
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
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
    height: moderateScale(220),
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
    width: moderateScale(180),
    height: moderateScale(180),
    borderRadius: moderateScale(90),
    backgroundColor: 'rgba(255, 179, 0, 0.08)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(20),
    right: -moderateScale(50),
    width: moderateScale(220),
    height: moderateScale(220),
    borderRadius: moderateScale(110),
    backgroundColor: 'rgba(255, 77, 28, 0.05)',
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  premiumDebtCard: {
    borderRadius: moderateScale(24),
    padding: moderateScale(20),
    ...Theme.shadow.floating,
  },
  premiumCardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(16),
  },
  premiumCardBrand: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: '#FFFFFF',
    letterSpacing: 1.5,
  },
  premiumCardChip: {
    opacity: 0.85,
  },
  premiumCardAmountSection: {
    marginBottom: moderateScale(4),
  },
  premiumDebtHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  premiumDebtLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(10),
    color: '#94A3B8',
    letterSpacing: 1.2,
  },
  premiumDebtAmount: {
    fontFamily: 'Outfit_800ExtraBold',
    fontSize: moderateScale(30),
    color: '#FFFFFF',
    marginTop: moderateScale(4),
  },
  premiumDebtIconContainer: {
    width: moderateScale(44),
    height: moderateScale(44),
    borderRadius: moderateScale(12),
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumDebtDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: moderateScale(14),
  },
  premiumDebtDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  premiumDebtDetailCol: {
    flex: 1,
  },
  premiumDebtDetailLabel: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    color: '#64748B',
    letterSpacing: 0.8,
  },
  premiumDebtDetailVal: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: '#FFFFFF',
    marginTop: moderateScale(2),
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
  debtContent: {
    flex: 1,
  },
  debtDetails: {
    flexDirection: 'row',
    gap: Theme.spacing.md,
    marginTop: moderateScale(4),
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
  repaymentsWidgetEmpty: {
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
  repaymentsWidgetEmptyIconContainer: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(24),
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: moderateScale(12),
  },
  repaymentsWidgetEmptyTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: '#475569',
    marginBottom: moderateScale(4),
  },
  repaymentsWidgetEmptySubtitle: {
    fontFamily: 'Outfit_400Regular',
    fontSize: moderateScale(12),
    color: '#94A3B8',
    textAlign: 'center',
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
  sectionActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  sectionActionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    paddingVertical: moderateScale(6),
    paddingHorizontal: moderateScale(12),
    borderRadius: moderateScale(12),
    ...Theme.shadow.sm,
  },
  sectionAction: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    color: Colors.white,
    letterSpacing: 0.5,
  },
  seeHistoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    paddingVertical: moderateScale(6),
    paddingHorizontal: moderateScale(12),
    borderRadius: moderateScale(12),
  },
  seeHistoryText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(10),
    color: Colors.primary,
    letterSpacing: 0.5,
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
  loanIconGradientContainer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Theme.spacing.sm,
  },
  loanChevron: {
    marginLeft: moderateScale(10),
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
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.text,
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  loanCard: {
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Theme.shadow.sm,
  },
  loanCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  repaymentLeft: {
    flex: 1,
  },
  loanTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  progressContainer: {
    marginVertical: Theme.spacing.sm,
  },
  progressBackground: {
    height: moderateScale(6),
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Theme.borderRadius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Theme.borderRadius.pill,
  },
  repaymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    ...Theme.shadow.sm,
  },
  repaymentTitle: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  repaymentRight: {
    alignItems: 'flex-end',
  },
  repaymentAmount: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.text,
  },
  repaymentStatusText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(9),
    letterSpacing: 0.5,
    marginTop: moderateScale(2),
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Theme.spacing.xxl,
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
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    ...Theme.shadow.floating,
    elevation: 8,
  },
  fabGradient: {
    width: '100%',
    height: '100%',
    borderRadius: moderateScale(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal Bottom Sheet Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalDismissArea: {
    flex: 1,
  },
  modalContentContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: moderateScale(24),
    borderTopRightRadius: moderateScale(24),
    maxHeight: '75%',
    paddingBottom: moderateScale(24),
    ...Theme.shadow.floating,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: moderateScale(16),
    paddingHorizontal: moderateScale(20),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(8),
  },
  modalTitleText: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(16),
    color: Colors.text,
  },
  modalCloseBtn: {
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollContent: {
    paddingHorizontal: moderateScale(20),
    paddingTop: moderateScale(16),
    gap: moderateScale(12),
  },
  modalEmptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(40),
  },
  modalEmptyTitle: {
    fontFamily: 'Outfit_600SemiBold',
    fontSize: moderateScale(14),
    color: Colors.textMuted,
    marginTop: moderateScale(8),
  },
  historyItemCard: {
    backgroundColor: Colors.white,
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    ...Theme.shadow.sm,
  },
  historyItemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(12),
    paddingHorizontal: moderateScale(12),
  },
  historyItemMeta: {
    flex: 1,
  },
  historyItemType: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(13),
    color: Colors.text,
  },
  historyItemNo: {
    fontFamily: 'Outfit_500Medium',
    fontSize: moderateScale(11),
    color: Colors.textSecondary,
    marginTop: 1,
  },
  historyItemDate: {
    fontFamily: 'Outfit_400Regular',
    fontSize: moderateScale(10),
    color: Colors.textMuted,
    marginTop: 2,
  },
  historyItemRight: {
    alignItems: 'flex-end',
    marginRight: moderateScale(6),
  },
  historyItemAmount: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(14),
    color: Colors.text,
  },
  statusPill: {
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(6),
  },
  logStatus: {
    fontFamily: 'Outfit_700Bold',
    fontSize: moderateScale(8),
    letterSpacing: 0.3,
  },
  chevron: {
    marginLeft: moderateScale(2),
  },
});

export default MyLoansScreen;

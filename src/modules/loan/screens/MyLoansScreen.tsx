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
} from 'react-native';
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

const MyLoansScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [loans, setLoans] = useState<NormalizedLoan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(err instanceof Error ? err.message : 'Unable to connect to the server.');
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

      {/* Fiery Orange Blur Orbs */}
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
          <Text style={styles.headerTitle}>Loans & Advances</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.yearLabel}>{currentYear}</Text>
          <Text style={styles.headerSubtitle}>Manage and review your advances and repayments.</Text>
        </View>
      </SafeAreaView>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading loans data...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={moderateScale(48)} color={Colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchLoans()}>
            <Text style={styles.retryText}>Retry</Text>
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
            {/* Apply Loan Premium Card */}
            <TouchableOpacity style={styles.applyCard} onPress={openApplyLoan} activeOpacity={0.88}>
              <LinearGradient
                colors={Colors.primaryGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.applyGradient}
              >
                <View style={styles.applyLeft}>
                  <View style={styles.applyIconWrap}>
                    <Ionicons name="add-circle-outline" size={moderateScale(26)} color={Colors.white} />
                  </View>
                  <View style={styles.applyCopy}>
                    <Text style={styles.applyTitle}>Apply for loan</Text>
                    <Text style={styles.applySubtitle}>Submit a new loan or advance request</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={moderateScale(20)} color="rgba(255,255,255,0.9)" />
              </LinearGradient>
            </TouchableOpacity>

            {/* Approved Total Amount Insight */}
            <AppCard style={styles.insightCard}>
              <View style={styles.insightIcon}>
                <Ionicons name="wallet-outline" size={moderateScale(24)} color={Colors.primary} />
              </View>
              <View style={styles.insightCopy}>
                <Text style={styles.insightTitle}>Total Approved Loan</Text>
                <Text style={styles.insightValue}>{formatCurrency(stats.totalApprovedAmount)}</Text>
              </View>
            </AppCard>

            {/* Quick Status Stats */}
            <View style={styles.summaryRow}>
              {statCards.map((item) => (
                <AppCard key={item.label} style={styles.summaryCard}>
                  <View style={[styles.summaryIcon, { backgroundColor: `${item.tone}12` }]}>
                    <Ionicons name={item.icon as any} size={moderateScale(20)} color={item.tone} />
                  </View>
                  <Text style={styles.summaryValue}>{item.value}</Text>
                  <Text style={styles.summaryLabel}>{item.label}</Text>
                </AppCard>
              ))}
            </View>

            {/* List Section Header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Loan Applications</Text>
            </View>

            {loans.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="cash-outline" size={moderateScale(44)} color={Colors.borderStrong} />
                <Text style={styles.emptyText}>No loan requests found.</Text>
                <TouchableOpacity style={styles.emptyButton} onPress={openApplyLoan} activeOpacity={0.85}>
                  <Text style={styles.emptyButtonText}>Request Loan & Advance</Text>
                </TouchableOpacity>
              </View>
            ) : (
              loans.map((item) => {
                const tone = statusTone[item.status] || statusTone.Pending;
                return (
                  <TouchableOpacity
                    key={item.id}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('LoanDetails', { loanId: item.id })}
                  >
                    <AppCard style={styles.logCard}>
                      <View style={[styles.logAccentBar, { backgroundColor: tone.color }]} />
                      <View style={styles.logContent}>
                        <View style={styles.logBody}>
                          <Text style={styles.logTitle}>{item.loanType}</Text>
                          <Text style={styles.logSub}>{item.loanNo}</Text>
                          <View style={styles.detailsRow}>
                            <View style={styles.detailTextWrapper}>
                              <Ionicons name="calendar-outline" size={12} color={Colors.textMuted} />
                              <Text style={styles.detailText}>Start: {formatMonth(item.deductFromMonth)}</Text>
                            </View>
                            <View style={styles.detailTextWrapper}>
                              <Ionicons name="repeat-outline" size={12} color={Colors.textMuted} />
                              <Text style={styles.detailText}>{item.installments} Months</Text>
                            </View>
                          </View>
                        </View>
                        <View style={styles.logMeta}>
                          <View style={[styles.statusPill, { backgroundColor: tone.bg }]}>
                            <Text style={[styles.logStatus, { color: tone.color }]}>{item.status}</Text>
                          </View>
                          <Text style={styles.logPrice}>{formatCurrency(item.loanAmount)}</Text>
                        </View>
                      </View>
                    </AppCard>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bannerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: moderateScale(280),
    overflow: 'hidden',
  },
  bannerGradient: {
    flex: 1,
  },
  bannerBlurOrb1: {
    position: 'absolute',
    top: -moderateScale(50),
    left: -moderateScale(50),
    width: moderateScale(200),
    height: moderateScale(200),
    borderRadius: moderateScale(100),
    backgroundColor: 'rgba(255, 179, 0, 0.15)',
  },
  bannerBlurOrb2: {
    position: 'absolute',
    top: moderateScale(40),
    right: -moderateScale(60),
    width: moderateScale(250),
    height: moderateScale(250),
    borderRadius: moderateScale(125),
    backgroundColor: 'rgba(255, 77, 28, 0.1)',
  },
  header: {
    backgroundColor: 'transparent',
    paddingBottom: Theme.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Theme.spacing.sm,
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
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
  headerContent: {
    paddingHorizontal: Theme.spacing.lg,
    marginBottom: Theme.spacing.sm,
  },
  yearLabel: {
    ...Typography.heading,
    color: Colors.text,
    fontSize: moderateScale(34),
    letterSpacing: -1,
  },
  headerSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginTop: moderateScale(4),
  },
  content: {
    paddingHorizontal: Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    gap: Theme.spacing.md,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.md,
    padding: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0,
    ...Theme.shadow.md,
  },
  insightIcon: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: moderateScale(10),
    backgroundColor: 'rgba(255, 77, 28, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightCopy: {
    flex: 1,
  },
  insightTitle: {
    ...Typography.body,
    fontSize: moderateScale(13),
    color: Colors.textSecondary,
    fontFamily: 'Outfit_600SemiBold',
  },
  insightValue: {
    ...Typography.title,
    fontSize: moderateScale(24),
    color: Colors.text,
    marginTop: moderateScale(2),
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Theme.spacing.sm,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Theme.spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xxl,
    borderWidth: 0,
    ...Theme.shadow.md,
  },
  summaryIcon: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.sm,
  },
  summaryValue: {
    ...Typography.heading,
    fontSize: moderateScale(22),
    color: Colors.text,
  },
  summaryLabel: {
    ...Typography.label,
    marginTop: moderateScale(2),
    color: Colors.textMuted,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Theme.spacing.sm,
    marginBottom: Theme.spacing.xs,
  },
  sectionTitle: {
    ...Typography.heading,
    fontSize: moderateScale(18),
    color: Colors.text,
  },
  sectionAction: {
    ...Typography.label,
    color: Colors.primary,
  },
  logCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Theme.borderRadius.xl,
    borderWidth: 0,
    padding: 0,
    overflow: 'hidden',
    ...Theme.shadow.md,
  },
  logAccentBar: {
    width: moderateScale(5),
    borderTopLeftRadius: Theme.borderRadius.xl,
    borderBottomLeftRadius: Theme.borderRadius.xl,
  },
  logContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: Theme.spacing.md,
  },
  logBody: {
    flex: 1,
    gap: 2,
  },
  logTitle: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    fontFamily: 'Outfit_700Bold',
    color: Colors.text,
  },
  logSub: {
    ...Typography.caption,
    fontSize: moderateScale(11),
    fontFamily: 'Outfit_500Medium',
    color: Colors.textMuted,
    marginTop: 1,
  },
  detailsRow: {
    flexDirection: 'row',
    gap: Theme.spacing.xs,
    marginTop: moderateScale(8),
  },
  detailTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: moderateScale(4),
    backgroundColor: Colors.surfaceMuted,
    paddingHorizontal: moderateScale(8),
    paddingVertical: moderateScale(4),
    borderRadius: Theme.borderRadius.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  detailText: {
    ...Typography.caption,
    fontSize: moderateScale(10),
    color: Colors.textSecondary,
    fontFamily: 'Outfit_600SemiBold',
  },
  logMeta: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: moderateScale(6),
    marginLeft: Theme.spacing.sm,
  },
  statusPill: {
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: Theme.borderRadius.pill,
  },
  logStatus: {
    ...Typography.label,
    fontSize: moderateScale(9),
    fontWeight: '800',
  },
  logPrice: {
    ...Typography.heading,
    fontSize: moderateScale(15),
    fontFamily: 'Outfit_700Bold',
    color: Colors.primary,
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
  applyCard: {
    borderRadius: Theme.borderRadius.xxl,
    overflow: 'hidden',
    ...Theme.shadow.floating,
    shadowOpacity: 0.12,
  },
  applyGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: moderateScale(18),
  },
  applyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
    flex: 1,
  },
  applyIconWrap: {
    width: moderateScale(48),
    height: moderateScale(48),
    borderRadius: Theme.borderRadius.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyCopy: {
    flex: 1,
  },
  applyTitle: {
    ...Typography.heading,
    color: Colors.white,
    fontSize: moderateScale(16),
    marginBottom: 2,
  },
  applySubtitle: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.85)',
    fontSize: moderateScale(12),
  },
});

export default MyLoansScreen;

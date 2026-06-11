import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '../../../services/apiClient';
import { getAuthSession } from '../../auth/services/auth';
import * as api from './loanRequest.service';

const loanHistoryStorageKey = (fkEmpId: string) => `@attendance/loan-history/${fkEmpId}`;

export interface NormalizedLoan {
  id: string;
  loanNo: string;
  loanDate: string;
  fkEmpId: string;
  loanType: string;
  loanAmount: number;
  voucherNo: string | null;
  interestRate: number;
  installments: number;
  returnThrough: string;
  deductFromMonth: string;
  calcMethod: string;
  remarks: string | null;
  status: 'Pending' | 'Approved' | 'Rejected';
  appliedOn: string;
  employeeName?: string | null;
}

export function calculateLocalEMI(
  principal: number,
  rate: number,
  installments: number,
  method: 'Equated Monthly Method' | 'Interest Calculation' | 'Remaining Balance Calculation',
  deductFromMonth: string
): api.LoanCalculationResult {
  const schedule: api.LoanAmortizationLine[] = [];
  let totalInterest = 0;
  let emi = 0;

  const addMonths = (startMonthStr: string, monthsToAdd: number): string => {
    const [yearStr, monthStr] = startMonthStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10) - 1;
    const date = new Date(year, month + monthsToAdd, 1);
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  };

  if (method === 'Equated Monthly Method') {
    const monthlyRate = rate / 12 / 100;
    if (monthlyRate === 0) {
      emi = principal / installments;
    } else {
      emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, installments)) / (Math.pow(1 + monthlyRate, installments) - 1);
    }

    let remainingBalance = principal;
    for (let i = 1; i <= installments; i++) {
      const month = addMonths(deductFromMonth, i - 1);
      let interest = remainingBalance * monthlyRate;
      let principalRepaid = emi - interest;

      if (i === installments || remainingBalance < principalRepaid) {
        principalRepaid = remainingBalance;
        interest = emi - principalRepaid;
        if (interest < 0) interest = 0;
        remainingBalance = 0;
      } else {
        remainingBalance -= principalRepaid;
      }

      totalInterest += interest;

      schedule.push({
        inst_no: i,
        inst_month: month,
        principal_amount: principalRepaid.toFixed(2),
        interest_amount: interest.toFixed(2),
        add_interest_amount: '0.00',
        total_payable: (principalRepaid + interest).toFixed(2),
        bal_principal: remainingBalance.toFixed(2),
      });
    }
  } else if (method === 'Interest Calculation') {
    const totalInt = (principal * (rate / 100) * installments) / 12;
    totalInterest = totalInt;
    const totalPayable = principal + totalInt;
    emi = totalPayable / installments;

    const monthlyInterest = totalInt / installments;
    const monthlyPrincipal = principal / installments;
    let remainingBalance = principal;

    for (let i = 1; i <= installments; i++) {
      const month = addMonths(deductFromMonth, i - 1);
      remainingBalance = Math.max(0, remainingBalance - monthlyPrincipal);

      schedule.push({
        inst_no: i,
        inst_month: month,
        principal_amount: monthlyPrincipal.toFixed(2),
        interest_amount: monthlyInterest.toFixed(2),
        add_interest_amount: '0.00',
        total_payable: emi.toFixed(2),
        bal_principal: remainingBalance.toFixed(2),
      });
    }
  } else {
    // Remaining Balance Calculation
    const monthlyPrincipal = principal / installments;
    const monthlyRate = rate / 12 / 100;
    let remainingBalance = principal;

    for (let i = 1; i <= installments; i++) {
      const month = addMonths(deductFromMonth, i - 1);
      const interest = remainingBalance * monthlyRate;
      let principalRepaid = monthlyPrincipal;

      if (i === installments) {
        principalRepaid = remainingBalance;
        remainingBalance = 0;
      } else {
        remainingBalance -= principalRepaid;
      }

      totalInterest += interest;
      const totalPayable = principalRepaid + interest;

      schedule.push({
        inst_no: i,
        inst_month: month,
        principal_amount: principalRepaid.toFixed(2),
        interest_amount: interest.toFixed(2),
        add_interest_amount: '0.00',
        total_payable: totalPayable.toFixed(2),
        bal_principal: remainingBalance.toFixed(2),
      });
    }

    emi = (principal + totalInterest) / installments;
  }

  const totalPayableAmount = principal + totalInterest;

  return {
    principal_amount: principal.toFixed(2),
    interest_amount: totalInterest.toFixed(2),
    add_interest_amount: '0.00',
    total_interest: totalInterest.toFixed(2),
    monthly_emi: emi.toFixed(2),
    total_payable_amount: totalPayableAmount.toFixed(2),
    balance_principal: principal.toFixed(2),
    schedule,
  };
}

export const normalizeLoan = (raw: api.LoanResponseItem): NormalizedLoan => {
  const amount = parseFloat(raw.loan_amount) || 0;
  const rate = parseFloat(raw.interest_rate || '0') || 0;
  
  let status: 'Pending' | 'Approved' | 'Rejected' = 'Pending';
  if (raw.authorize) {
    status = raw.accepted === 'Accept' ? 'Approved' : 'Rejected';
  } else if (raw.last_status === 'Rejected') {
    status = 'Rejected';
  }

  return {
    id: raw.pk_loan_id,
    loanNo: raw.loan_no,
    loanDate: raw.loan_date,
    fkEmpId: raw.fk_emp_id,
    loanType: raw.loan_type,
    loanAmount: amount,
    voucherNo: raw.voucher_no,
    interestRate: rate,
    installments: raw.installments,
    returnThrough: raw.return_through,
    deductFromMonth: raw.deduct_from_month,
    calcMethod: raw.calc_method,
    remarks: raw.remarks,
    status,
    appliedOn: raw.loan_date,
    employeeName: raw.employee_name || null,
  };
};

export const getCachedLoans = async (fkEmpId: string): Promise<NormalizedLoan[]> => {
  try {
    const stored = await AsyncStorage.getItem(loanHistoryStorageKey(fkEmpId));
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => item as NormalizedLoan);
  } catch {
    return [];
  }
};

export const setCachedLoans = async (fkEmpId: string, loans: NormalizedLoan[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(loanHistoryStorageKey(fkEmpId), JSON.stringify(loans));
  } catch {}
};

export const getLoans = async (): Promise<NormalizedLoan[]> => {
  const session = await getAuthSession();
  if (!session?.access_token) {
    throw new ApiError('Authentication required. Please log in again.');
  }

  const fkEmpId = String(session.user.fkEmpId);
  const localCache = await getCachedLoans(fkEmpId);

  try {
    // Regular employees fetch only their own loans
    const rawLoans = await api.getLoanHistory(1, 100, true);
    const normalized = rawLoans.map(normalizeLoan);
    await setCachedLoans(fkEmpId, normalized);
    return normalized;
  } catch (error) {
    // Return cache if server unreachable
    if (localCache.length > 0) {
      return localCache;
    }
    throw error;
  }
};

export const submitLoanRequest = async (payload: api.LoanRequestPayload): Promise<NormalizedLoan> => {
  const session = await getAuthSession();
  if (!session?.access_token) {
    throw new ApiError('Authentication required. Please log in again.');
  }

  const result = await api.createLoan(payload);
  const details = await api.getLoanDetails(result.pk_loan_id);
  const normalized = normalizeLoan(details);

  const fkEmpId = String(session.user.fkEmpId);
  const current = await getCachedLoans(fkEmpId);
  await setCachedLoans(fkEmpId, [normalized, ...current]);

  return normalized;
};

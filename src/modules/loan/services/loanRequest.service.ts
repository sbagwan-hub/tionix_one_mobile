import { apiRequest, ApiError } from '../../../services/apiClient';
import { getAuthSession } from '../../auth/services/auth';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface LoanAmortizationLine {
  inst_no: number;
  inst_month: string;
  principal_amount: string;
  interest_amount: string;
  add_interest_amount: string;
  total_payable: string;
  bal_principal: string;
}

export interface LoanCalculationResult {
  principal_amount: string;
  interest_amount: string;
  add_interest_amount: string;
  total_interest: string;
  monthly_emi: string;
  total_payable_amount: string;
  balance_principal: string;
  schedule: LoanAmortizationLine[];
}

export interface LoanRequestPayload {
  loan_no: string;
  loan_date: string;
  fk_emp_id: string;
  loan_type: string;
  loan_amount: number;
  voucher_no?: string | null;
  interest_rate: number;
  installments: number;
  return_through: 'Salary' | 'Hand';
  deduct_from_month: string;
  calc_method: 'Equated Monthly Method' | 'Interest Calculation' | 'Remaining Balance Calculation';
  remarks?: string | null;
}

export interface LoanResponseItem {
  pk_loan_id: string;
  loan_no: string;
  loan_date: string;
  fk_emp_id: string;
  loan_type: string;
  loan_amount: string;
  voucher_no: string | null;
  interest_rate: string | null;
  installments: number;
  return_through: string;
  deduct_from_month: string;
  calc_method: string;
  remarks: string | null;
  sys_defined: boolean | null;
  last_status: string | null;
  authorize: boolean | null;
  accepted: string | null;
  a_remarks: string | null;
  employee_name?: string | null;
}

export interface LoanDetailsResponse extends LoanResponseItem {
  schedule: Array<{
    pk_schedule_id: string;
    fk_loan_id: string;
    inst_no: number;
    inst_month: string;
    principal_amount: string;
    interest_amount: string;
    add_interest_amount: string | null;
    total_payable: string;
    bal_principal: string;
    status: string | null;
  }>;
}

export interface EmployeeOption {
  pk_emp_id: number;
  emp_code: string;
  contact_name: string;
  department: string | null;
  designation: string | null;
  fk_set_id: string | null;
  doj: string;
}

// ─────────────────────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────────────────────

const LOAN_ENDPOINTS = {
  LIST: '/api/mobile/loan-requests',
  CREATE: '/api/mobile/loan-requests',
  GET_BY_ID: (id: string) => `/api/mobile/loan-requests/${id}`,
  UPDATE: (id: string) => `/api/mobile/loan-requests/${id}`,
  DELETE: (id: string) => `/api/mobile/loan-requests/${id}`,
  AUTHORIZE: (id: string) => `/api/mobile/loan-requests/${id}/authorize`,
  CALCULATE: '/api/mobile/loan-requests/calculate',
  EMPLOYEES: '/api/mobile/loan-requests/employees',
};

// ─────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────

/**
 * Fetch employee options list
 */
export async function getEmployees(): Promise<EmployeeOption[]> {
  const session = await getAuthSession();
  const response = await apiRequest<{ success: boolean; data: EmployeeOption[] }>(
    LOAN_ENDPOINTS.EMPLOYEES,
    {
      method: 'GET',
      token: session?.access_token,
    }
  );
  return response.data;
}

/**
 * Request Amortization Calculation Preview
 */
export async function calculateEMISchedule(payload: {
  loan_amount: number;
  interest_rate: number;
  installments: number;
  calc_method: string;
  deduct_from_month: string;
}): Promise<LoanCalculationResult> {
  const session = await getAuthSession();
  const response = await apiRequest<{ success: boolean; data: LoanCalculationResult }>(
    LOAN_ENDPOINTS.CALCULATE,
    {
      method: 'POST',
      body: payload,
      token: session?.access_token,
    }
  );
  return response.data;
}

/**
 * Create a new Loan Request
 */
export async function createLoan(payload: LoanRequestPayload): Promise<{ pk_loan_id: string }> {
  const session = await getAuthSession();
  const response = await apiRequest<{ success: boolean; data: { pk_loan_id: string } }>(
    LOAN_ENDPOINTS.CREATE,
    {
      method: 'POST',
      body: payload,
      token: session?.access_token,
    }
  );
  return response.data;
}

/**
 * Update a Loan Request
 */
export async function updateLoan(id: string, payload: Partial<LoanRequestPayload>): Promise<void> {
  const session = await getAuthSession();
  await apiRequest<void>(
    LOAN_ENDPOINTS.UPDATE(id),
    {
      method: 'PUT',
      body: payload,
      token: session?.access_token,
    }
  );
}

/**
 * Delete a Loan Request
 */
export async function deleteLoan(id: string): Promise<void> {
  const session = await getAuthSession();
  await apiRequest<void>(
    LOAN_ENDPOINTS.DELETE(id),
    {
      method: 'DELETE',
      token: session?.access_token,
    }
  );
}

/**
 * Fetch all loan requests
 */
export async function getLoanHistory(
  page: number = 1,
  pageSize: number = 50,
  ownRecord: boolean = true
): Promise<LoanResponseItem[]> {
  const session = await getAuthSession();
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });

  if (ownRecord && session?.user?.fkEmpId) {
    params.append('own_record', 'true');
    params.append('fk_emp_id', String(session.user.fkEmpId));
  }

  const response = await apiRequest<{ success: boolean; data: { data: LoanResponseItem[]; meta: any } }>(
    `${LOAN_ENDPOINTS.LIST}?${params.toString()}`,
    {
      method: 'GET',
      token: session?.access_token,
    }
  );

  return response.data?.data || [];
}

/**
 * Fetch a single loan request by ID
 */
export async function getLoanDetails(id: string): Promise<LoanDetailsResponse> {
  const session = await getAuthSession();
  const response = await apiRequest<{ success: boolean; data: LoanDetailsResponse }>(
    LOAN_ENDPOINTS.GET_BY_ID(id),
    {
      method: 'GET',
      token: session?.access_token,
    }
  );
  return response.data;
}

/**
 * Authorize or reject a loan request
 */
export async function authorizeLoan(id: string, accepted: 'Accept' | 'Reject', remarks: string): Promise<void> {
  const session = await getAuthSession();
  await apiRequest<void>(
    LOAN_ENDPOINTS.AUTHORIZE(id),
    {
      method: 'POST',
      body: { accepted, a_remarks: remarks },
      token: session?.access_token,
    }
  );
}

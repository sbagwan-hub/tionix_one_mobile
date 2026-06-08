import { apiRequest, ApiError } from '../../../services/apiClient';
import { getAuthSession } from '../../auth/services/auth';

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface LeaveBalance {
  fk_emp_id: string;
  employee_name: string;
  bal_annual_leave: number;
  bal_paid_holiday: number;
  bal_sick_leave: number;
  bal_paid_casual: number;
  bal_unpaid_casual: number;
  tot_annual_leave: number;
  tot_paid_holiday: number;
  tot_sick_leave: number;
  tot_paid_casual: number;
  tot_unpaid_casual: number;
}

export interface LeaveType {
  id: string;
  label: string;
}

export interface LeaveRequestItem {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  isHalfDay: boolean;
}

export interface LeaveRequestResponse {
  success: boolean;
  data?: any;
  message?: string;
}

// ─────────────────────────────────────────────────────────────
// API ENDPOINTS
// ─────────────────────────────────────────────────────────────

const LEAVE_REQUEST_ENDPOINTS = {
  LIST: '/api/mobile/leave-requests',
  CREATE: '/api/mobile/leave-requests',
  GET_BY_ID: (id: string) => `/api/mobile/leave-requests/${id}`,
  UPDATE: (id: string) => `/api/mobile/leave-requests/${id}`,
  DELETE: (id: string) => `/api/mobile/leave-requests/${id}`,
  AUTHORIZE: (id: string) => `/api/mobile/leave-requests/${id}/authorize`,
  BALANCE: '/api/mobile/leave-requests/balance',
  EMPLOYEES: '/api/mobile/leave-requests/employees',
  LEAVE_TYPES: '/api/mobile/leave-requests/leave-types',
};

// ─────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────

/**
 * Get employee leave balance
 */
export async function getLeaveBalance(
  fkEmpId: string,
  fromDate: string,
  toDate: string
): Promise<LeaveBalance> {
  const session = await getAuthSession();
  const params = new URLSearchParams({
    fk_emp_id: fkEmpId,
    from_date: fromDate,
    to_date: toDate,
  });
  const response = await apiRequest<LeaveBalance>(
    `${LEAVE_REQUEST_ENDPOINTS.BALANCE}?${params.toString()}`,
    {
      method: 'GET',
      token: session?.token,
    }
  );

  return response;
}

/**
 * Get leave types dropdown
 */
export async function getLeaveTypes(): Promise<LeaveType[]> {
  const session = await getAuthSession();
  const response = await apiRequest<LeaveType[]>(
    LEAVE_REQUEST_ENDPOINTS.LEAVE_TYPES,
    {
      method: 'GET',
      token: session?.token,
    }
  );

  return response;
}

/**
 * Apply for leave (create leave request)
 */
export async function applyForLeave(
  item: LeaveRequestItem
): Promise<LeaveRequestResponse> {
  const session = await getAuthSession();
  
  const payload = {
    request_no: generateRequestNumber(),
    request_date: new Date().toISOString().split('T')[0],
    from_date: item.startDate,
    to_date: item.endDate,
    fk_emp_id: session?.user?.fkEmpId,
    reason: item.reason,
    remarks: '',
    details: [
      {
        lr_date: item.startDate,
        lr_day: item.isHalfDay ? 'Half Day' : 'Full Day',
        type: item.leaveType,
        typ_id: getLeaveTypeId(item.leaveType),
      },
    ],
    // Balance fields (will be calculated by backend)
    bal_leave: '0',
    bal_paid: '0',
    bal_sick: '0',
    bal_paid_casual: '0',
    bal_unpaid_casual: '0',
    // Applied leave breakdown
    rest_day: '0',
    unpaid_leave: '0',
    paid_holiday: '0',
    sick_leave: '0',
    paid_casual: '0',
    unpaid_casual: '0',
    maternity: '0',
    paid_leave: '0',
    total_leave: '0',
    absent: '0',
  };

  const response = await apiRequest<{ pk_lr_id: string }>(
    LEAVE_REQUEST_ENDPOINTS.CREATE,
    {
      method: 'POST',
      body: payload,
      token: session?.token,
    }
  );

  return {
    success: true,
    data: response,
  };
}

/**
 * Get leave history for current employee
 */
export async function getLeaveHistory(
  page: number = 1,
  pageSize: number = 50
): Promise<any> {
  const session = await getAuthSession();
  const currentFY = getCurrentFinancialYear();

  const params = new URLSearchParams({
    from_req_date: currentFY.from,
    to_req_date: currentFY.to,
    own_record: 'true',
    fk_set_id: session?.user?.pkUserId || '',
    page: String(page),
    page_size: String(pageSize),
  });
  const response = await apiRequest(
    `${LEAVE_REQUEST_ENDPOINTS.LIST}?${params.toString()}`,
    {
      method: 'GET',
      token: session?.token,
    }
  );

  return response;
}

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

function generateRequestNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const nextYear = year + 1;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `LR/${year}-${nextYear}/${rand}`;
}

function getCurrentFinancialYear(): { from: string; to: string } {
  const now = new Date();
  const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    from: `${year}-04-01`,
    to: `${year + 1}-03-31`,
  };
}

function getLeaveTypeId(leaveType: string): string {
  const typeMap: Record<string, string> = {
    'Annual Leave': '502',
    'Paid Holiday': '504',
    'Sick Leave': '505',
    'Paid Casual Leave': '506',
    'Unpaid Casual Leave': '507',
    'Unpaid Leave': '508',
    'Absent': '509',
    'Rest Day': '510',
    'Maternity Leave': '512',
  };
  return typeMap[leaveType] || '502';
}

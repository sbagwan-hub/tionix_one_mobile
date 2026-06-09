import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../../../config/api';
import { apiRequest, ApiError } from '../../../services/apiClient';
import { getAuthSession } from '../../auth/services/auth';
import { getLeaveBalance as getLeaveBalanceApi, getLeaveTypes as getLeaveTypesApi, applyForLeave as applyForLeaveApi, getLeaveHistory as getLeaveHistoryApi } from './leaveRequest.service';

const leaveHistoryStorageKey = (fkEmpId: number) => `@attendance/leave-history/${fkEmpId}`;

export type LeaveType = {
  id: string;
  label: string;
  icon: string;
  remaining?: number | null;
  total?: number | null;
};

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export type LeaveRequest = {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  appliedOn: string;
  isHalfDay?: boolean;
};

export type ApplyLeavePayload = {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string;
  isHalfDay?: boolean;
};

export type LeaveHistoryResponse = {
  success: boolean;
  data?: LeaveRequest[];
  leaves?: LeaveRequest[];
};

type LeaveTypesResponse = {
  success?: boolean;
  types?: Array<Record<string, unknown>>;
  data?: Array<Record<string, unknown>>;
  leaveTypes?: Array<Record<string, unknown>>;
};

export type ApplyLeaveResponse = {
  success: boolean;
  message?: string;
  leave?: LeaveRequest;
};

export const DEFAULT_LEAVE_TYPES: LeaveType[] = [
  { id: 'casual', label: 'Casual Leave', icon: 'sunny-outline' },
  { id: 'sick', label: 'Sick Leave', icon: 'medkit-outline' },
  { id: 'earned', label: 'Earned Leave', icon: 'ribbon-outline' },
  { id: 'unpaid', label: 'Unpaid Leave', icon: 'wallet-outline' },
];

const toNumberOrNull = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const normalizeLeaveType = (raw: Record<string, unknown>, fallbackIcon: string): LeaveType | null => {
  const id = String(raw.id ?? raw.code ?? raw.typeId ?? raw.leaveTypeId ?? raw.LeaveTypeId ?? '').trim();
  const label = String(raw.label ?? raw.name ?? raw.type ?? raw.leaveType ?? raw.LeaveType ?? '').trim();

  if (!id && !label) {
    return null;
  }

  const remaining =
    toNumberOrNull(
      raw.remaining ??
        raw.balance ??
        raw.available ??
        raw.remainingDays ??
        raw.balanceDays ??
        raw.Available ??
        raw.Remaining,
    ) ?? null;

  const total =
    toNumberOrNull(
      raw.total ??
        raw.entitlement ??
        raw.allocated ??
        raw.totalDays ??
        raw.entitledDays ??
        raw.Total ??
        raw.Entitlement,
    ) ?? null;

  return {
    id: id || label.toLowerCase().replace(/\s+/g, '-'),
    label: label || id,
    icon: (raw.icon as string) || fallbackIcon,
    remaining,
    total,
  };
};

const isWorkFromHomeType = (type: LeaveType) => {
  const id = type.id.toLowerCase();
  const label = type.label.toLowerCase();
  return id === 'wfh' || label.includes('work from home') || label.includes('work-from-home');
};

export const getLeaveBalances = async (): Promise<LeaveType[]> => {
  const session = await getAuthSession();

  if (!session?.accessToken) {
    throw new ApiError('Authentication required. Please log in again.');
  }

  try {
    const fkEmpId = String(session.user.fkEmpId);
    const today = new Date();
    const year = today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
    const fromDate = `${year}-04-01`;
    const toDate = `${year + 1}-03-31`;

    const balance = await getLeaveBalanceApi(fkEmpId, fromDate, toDate);
    
    // Map balance to LeaveType format
    const types: LeaveType[] = [
      {
        id: 'annual',
        label: 'Annual Leave',
        icon: 'ribbon-outline',
        remaining: balance.bal_annual_leave,
        total: balance.tot_annual_leave,
      },
      {
        id: 'paid-holiday',
        label: 'Paid Holiday',
        icon: 'calendar-outline',
        remaining: balance.bal_paid_holiday,
        total: balance.tot_paid_holiday,
      },
      {
        id: 'sick',
        label: 'Sick Leave',
        icon: 'medkit-outline',
        remaining: balance.bal_sick_leave,
        total: balance.tot_sick_leave,
      },
      {
        id: 'paid-casual',
        label: 'Paid Casual Leave',
        icon: 'sunny-outline',
        remaining: balance.bal_paid_casual,
        total: balance.tot_paid_casual,
      },
      {
        id: 'unpaid-casual',
        label: 'Unpaid Casual Leave',
        icon: 'wallet-outline',
        remaining: balance.bal_unpaid_casual,
        total: balance.tot_unpaid_casual,
      },
    ];

    return types.filter(t => t.remaining !== undefined && t.remaining !== null);
  } catch (error) {
    if (isMissingLeaveRouteError(error)) {
      return DEFAULT_LEAVE_TYPES;
    }
    throw error;
  }
};

const readLocalLeaveHistory = async (fkEmpId: number): Promise<LeaveRequest[]> => {
  if (!fkEmpId) {
    return [];
  }

  try {
    const stored = await AsyncStorage.getItem(leaveHistoryStorageKey(fkEmpId));
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((row, index) => normalizeLeaveRequest(row as Record<string, unknown>, index))
      .filter(item => item.leaveType);
  } catch {
    return [];
  }
};

const writeLocalLeaveHistory = async (fkEmpId: number, items: LeaveRequest[]) => {
  if (!fkEmpId) {
    return;
  }

  await AsyncStorage.setItem(leaveHistoryStorageKey(fkEmpId), JSON.stringify(items));
};

const appendLocalLeaveRequest = async (fkEmpId: number, item: LeaveRequest) => {
  const existing = await readLocalLeaveHistory(fkEmpId);
  await writeLocalLeaveHistory(fkEmpId, [item, ...existing.filter(entry => entry.id !== item.id)]);
};

const buildLeaveRequestFromPayload = (payload: ApplyLeavePayload): LeaveRequest => {
  const start = new Date(`${payload.startDate}T00:00:00`);
  const end = new Date(`${payload.endDate}T00:00:00`);
  const days =
    Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
      ? payload.isHalfDay
        ? 0.5
        : 1
      : payload.isHalfDay
        ? 0.5
        : Math.max(1, Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);

  return {
    id: String(Date.now()),
    leaveType: payload.leaveType,
    startDate: payload.startDate,
    endDate: payload.endDate,
    days,
    reason: payload.reason,
    status: 'Pending',
    appliedOn: new Date().toISOString(),
    isHalfDay: payload.isHalfDay,
  };
};

const isMissingLeaveRouteError = (error: unknown) =>
  error instanceof ApiError && (error.status === 404 || error.status === 405);

const normalizeLeaveRequest = (raw: Record<string, unknown>, index: number): LeaveRequest => {
  const startDate = String(raw.startDate ?? raw.fromDate ?? raw.StartDate ?? '');
  const endDate = String(raw.endDate ?? raw.toDate ?? raw.EndDate ?? startDate);
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const computedDays =
    Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())
      ? Number(raw.days ?? 1)
      : Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);

  const statusRaw = String(raw.status ?? raw.leaveStatus ?? 'Pending');
  const status = (['Pending', 'Approved', 'Rejected', 'Cancelled'].includes(statusRaw)
    ? statusRaw
    : 'Pending') as LeaveStatus;

  return {
    id: String(raw.id ?? raw.pkLeaveId ?? raw.leaveId ?? index),
    leaveType: String(raw.leaveType ?? raw.type ?? raw.LeaveType ?? 'Leave'),
    startDate,
    endDate,
    days: Number(raw.days ?? raw.totalDays ?? computedDays) || computedDays,
    reason: String(raw.reason ?? raw.remarks ?? raw.Remarks ?? ''),
    status,
    appliedOn: String(raw.appliedOn ?? raw.createdAt ?? raw.DateTimeStamp ?? new Date().toISOString()),
    isHalfDay: Boolean(raw.isHalfDay ?? raw.halfDay),
  };
};

export const getLeaveHistory = async (): Promise<LeaveRequest[]> => {
  const session = await getAuthSession();

  if (!session?.accessToken) {
    throw new ApiError('Authentication required. Please log in again.');
  }

  const fkEmpId = Number(session.user.fkEmpId);
  const localHistory = await readLocalLeaveHistory(fkEmpId);

  try {
    const response = await getLeaveHistoryApi(1, 50);
    
    // Map API response to LeaveRequest format
    const remoteHistory = (response.data || []).map((row: any, index: number) => {
      const startDate = row.from_date || row.startDate || '';
      const endDate = row.to_date || row.endDate || startDate;
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      const computedDays = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1);

      const statusRaw = row.authorize ? (row.accepted === 'Accept' ? 'Approved' : 'Rejected') : 'Pending';
      const status = (['Pending', 'Approved', 'Rejected', 'Cancelled'].includes(statusRaw)
        ? statusRaw
        : 'Pending') as LeaveStatus;

      return {
        id: String(row.pk_lr_id || index),
        leaveType: row.reason || 'Leave',
        startDate,
        endDate,
        days: Number(row.total_leave) || computedDays,
        reason: row.reason || row.remarks || '',
        status,
        appliedOn: row.request_date || new Date().toISOString(),
        isHalfDay: false,
      };
    });

    if (remoteHistory.length > 0) {
      await writeLocalLeaveHistory(fkEmpId, remoteHistory);
      return remoteHistory;
    }

    return localHistory;
  } catch (error) {
    if (isMissingLeaveRouteError(error) || localHistory.length > 0) {
      return localHistory;
    }

    throw error;
  }
};

export const applyForLeave = async (payload: ApplyLeavePayload): Promise<LeaveRequest> => {
  const session = await getAuthSession();

  if (!session?.accessToken) {
    throw new ApiError('Authentication required. Please log in again.');
  }

  const fkEmpId = Number(session.user.fkEmpId);

  try {
    const response = await applyForLeaveApi({
      leaveType: payload.leaveType,
      startDate: payload.startDate,
      endDate: payload.endDate,
      reason: payload.reason,
      isHalfDay: payload.isHalfDay ?? false,
    });

    if (!response.success) {
      throw new ApiError(response.message ?? 'Unable to submit leave request.');
    }

    const created = buildLeaveRequestFromPayload(payload);
    await appendLocalLeaveRequest(fkEmpId, created);
    return created;
  } catch (error) {
    if (isMissingLeaveRouteError(error)) {
      const created = buildLeaveRequestFromPayload(payload);
      await appendLocalLeaveRequest(fkEmpId, created);
      return created;
    }

    throw error;
  }
};

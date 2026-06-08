import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';
import { apiRequest, ApiError } from './apiClient';
import { getAuthSession } from './auth';

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

  if (!session?.token) {
    throw new ApiError('Authentication required. Please log in again.');
  }

  try {
    const response = await apiRequest<LeaveTypesResponse>(API_ENDPOINTS.leaveTypes, {
      method: 'GET',
      token: session.token,
      quiet: true,
    });

    const rows = response.types ?? response.data ?? response.leaveTypes ?? [];

    if (!Array.isArray(rows) || rows.length === 0) {
      return DEFAULT_LEAVE_TYPES;
    }

    const normalized = rows
      .map((row, index) => {
        const fallback = DEFAULT_LEAVE_TYPES[index % DEFAULT_LEAVE_TYPES.length]?.icon ?? 'list-outline';
        return normalizeLeaveType(row as Record<string, unknown>, fallback);
      })
      .filter(Boolean) as LeaveType[];

    return normalized
      .map(type => {
        const match = DEFAULT_LEAVE_TYPES.find(
          candidate => candidate.id === type.id || candidate.label.toLowerCase() === type.label.toLowerCase(),
        );
        return match ? { ...type, icon: match.icon, id: match.id } : type;
      })
      .filter(type => !isWorkFromHomeType(type));
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

  if (!session?.token) {
    throw new ApiError('Authentication required. Please log in again.');
  }

  const fkEmpId = Number(session.user.fkEmpId);
  const localHistory = await readLocalLeaveHistory(fkEmpId);

  try {
    const response = await apiRequest<LeaveHistoryResponse>(API_ENDPOINTS.leaveHistory, {
      method: 'GET',
      token: session.token,
      quiet: true,
    });

    const rows = response.data ?? response.leaves ?? [];
    const remoteHistory = rows.map((row, index) =>
      normalizeLeaveRequest(row as Record<string, unknown>, index),
    );

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

  if (!session?.token) {
    throw new ApiError('Authentication required. Please log in again.');
  }

  const fkEmpId = Number(session.user.fkEmpId);

  try {
    const response = await apiRequest<ApplyLeaveResponse>(API_ENDPOINTS.leaveApply, {
      method: 'POST',
      token: session.token,
      body: {
        empCode: session.user.UserName,
        fkEmpId: session.user.fkEmpId,
        leaveType: payload.leaveType,
        startDate: payload.startDate,
        endDate: payload.endDate,
        fromDate: payload.startDate,
        toDate: payload.endDate,
        reason: payload.reason,
        isHalfDay: payload.isHalfDay ?? false,
      },
    });

    if (!response.success) {
      throw new ApiError(response.message ?? 'Unable to submit leave request.');
    }

    const created = response.leave
      ? normalizeLeaveRequest(response.leave as unknown as Record<string, unknown>, 0)
      : buildLeaveRequestFromPayload(payload);

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

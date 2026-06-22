import { API_ENDPOINTS } from '../../../config/api';
import { COMPANY } from '../../../config/company';
import { apiRequest, ApiError } from '../../../services/apiClient';
import { getAuthSession } from '../../auth/services/auth';

export type AttendanceResponse = {
  success: boolean;
  message: string;
  distance: string;
  data?: {
    location_type: string;
    location_id: number;
    location_name: string;
    allowed_radius: number;
    distance: number;
    withinRadius: boolean;
    geofenceEnforced: boolean;
    matching_rule: string;
    office?: {
      locationId: number;
      name: string;
      radius: number;
    };
    address?: string;
  };
  shift?: any | null;
};

export const punchIn = async (
  latitude: number,
  longitude: number,
): Promise<AttendanceResponse> => {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const payload = {
    empCode: String(session.user.fkEmpId || session.user.UserName),
    latitude,
    longitude,
  };

  return await apiRequest<AttendanceResponse>(API_ENDPOINTS.attendance, {
    method: 'POST',
    body: payload,
    token: session.access_token,
  });
};

export const punchOut = async (
  latitude: number,
  longitude: number,
): Promise<AttendanceResponse> => {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const payload = {
    empCode: String(session.user.fkEmpId || session.user.UserName),
    latitude,
    longitude,
  };

  return await apiRequest<AttendanceResponse>(API_ENDPOINTS.checkout, {
    method: 'POST',
    body: payload,
    token: session.access_token,
  });
};

export const punchBreak = async (
  latitude: number,
  longitude: number,
  remark?: string,
): Promise<AttendanceResponse> => {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const payload = {
    empCode: String(session.user.fkEmpId || session.user.UserName),
    latitude,
    longitude,
    status: 'Break',
    remark,
  };

  return await apiRequest<AttendanceResponse>(API_ENDPOINTS.attendance, {
    method: 'POST',
    body: payload,
    token: session.access_token,
  });
};

export const punchResume = async (
  latitude: number,
  longitude: number,
): Promise<AttendanceResponse> => {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const payload = {
    empCode: String(session.user.fkEmpId || session.user.UserName),
    latitude,
    longitude,
    status: 'Resume',
  };

  return await apiRequest<AttendanceResponse>(API_ENDPOINTS.attendance, {
    method: 'POST',
    body: payload,
    token: session.access_token,
  });
};

export type AttendanceStatusResponse = {
  success: boolean;
  status: string;
  lastPunchTime: string | null;
  lastAddress: string | null;
  empCode?: number;
  nextSuggestedPunch?: string;
  shift?: any;
  liveLocation?: any;
  todayWork?: string;
  todayBreak?: string;
};

export const getAttendanceStatus = async (empId?: number): Promise<AttendanceStatusResponse> => {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const fkEmpId = empId ?? Number(session.user.fkEmpId);

  if (!fkEmpId) {
    throw new Error('Employee ID is missing.');
  }

  const response = await apiRequest<{
    success: boolean;
    data?: {
      status: string;
      lastPunchTime: string | null;
      lastAddress: string | null;
      empCode?: number;
      nextSuggestedPunch?: string;
      shift?: any;
      liveLocation?: any;
      todayWork?: string;
      todayBreak?: string;
    };
  }>(API_ENDPOINTS.status(fkEmpId), {
    method: 'GET',
    token: session.access_token,
  });

  return {
    success: response.success,
    status: response.data?.status ?? 'Not Checked In',
    lastPunchTime: response.data?.lastPunchTime ?? null,
    lastAddress: response.data?.lastAddress ?? null,
    empCode: response.data?.empCode,
    nextSuggestedPunch: response.data?.nextSuggestedPunch,
    shift: response.data?.shift,
    liveLocation: response.data?.liveLocation,
    todayWork: response.data?.todayWork,
    todayBreak: response.data?.todayBreak,
  };
};

export type AttendanceConfigResponse = {
  success: boolean;
  config: {
    latitude: number;
    longitude: number;
    radius: number;
    liveTracking?: any;
  };
};

export type LiveLocationPayload = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  status: string;
};

export type LiveLocationRecord = {
  empCode: string;
  empName: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  heading: number | null;
  speed: number | null;
  address: string | null;
  recordedAt: string;
  status: string;
  source: string;
  locationId: string | null;
  officeName: string | null;
  distanceFromOfficeMeters: number | null;
  isInsideOfficeRadius: boolean | null;
  officeRadiusMeters: number;
  geofenceStatus: string;
  lastSeenAt: string;
  lastSeenSecondsAgo: number;
  lastSeenLabel: string;
  shift: unknown;
  gpsTrustStatus: string;
  isSuspiciousGps: boolean;
  gpsRiskScore: number;
  gpsFlags: string[];
};

export type LiveLocationTracking = {
  pingIntervalSeconds: number;
  staleAfterSeconds: number;
  recommendedPingMs: number;
  backgroundTracking?: {
    enabled: boolean;
    pingIntervalSeconds: number;
    recommendedBackgroundPingMs: number;
    staleAfterSeconds: number;
    allowBackground: boolean;
  };
  fakeGpsDetection?: {
    enabled: boolean;
    maxSpeedMs: number;
  };
};

export type LiveLocationResponse = {
  success: boolean;
  message: string;
  location: LiveLocationRecord;
  tracking: LiveLocationTracking;
};

export type LiveLocationConfigResponse = {
  success: boolean;
  tracking: LiveLocationTracking;
};

export const getLiveLocationConfig = async (): Promise<LiveLocationConfigResponse> => {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in again.');
  }

  return await apiRequest<LiveLocationConfigResponse>(API_ENDPOINTS.liveLocationConfig, {
    method: 'GET',
    token: session.access_token,
  });
};

export const postLiveLocation = async ({
  latitude,
  longitude,
  status,
}: LiveLocationPayload): Promise<LiveLocationResponse> => {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const payload = {
    status,
    latitude,
    longitude,
  };

  return await apiRequest<LiveLocationResponse>(
    API_ENDPOINTS.liveLocation,
    {
      method: 'POST',
      body: payload,
      token: session.access_token,
    },
  );
};

export const getAttendanceConfig = async (): Promise<AttendanceConfigResponse> => {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in again.');
  }

  return await apiRequest<AttendanceConfigResponse>(API_ENDPOINTS.config, {
    method: 'GET',
    token: session.access_token,
  });
};

export type GeolocationItem = {
  pkGeoId: number;
  OfficeName: string;
  fkHLId: number;
  Latitude: number;
  Longitude: number;
  RadiusMeters: number;
  IsActive: boolean;
  CreatedAt: string;
  officeName: string;
};

export type GeolocationResponse = {
  success: boolean;
  geolocations: GeolocationItem[];
};

const isAdminRole = (role?: string) => {
  const normalized = (role ?? '').toLowerCase();
  return normalized === 'admin' || normalized === 'superadmin';
};

export const getGeolocations = async (): Promise<GeolocationResponse> => {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in again.');
  }

  try {
    return await apiRequest<GeolocationResponse>(API_ENDPOINTS.geolocations, {
      method: 'GET',
      token: session.access_token,
    });
  } catch (error) {
    console.error('Failed to fetch geolocations from API:', error);
    throw error;
  }
};


export type AttendanceRecord = {
  EmpCode: string;
  EmpName: string;
  Punch: string;
  PunchDatetime: string;
  Latitude: number;
  Longitude: number;
  Address: string | null;
  Device: string | null;
};

export type AttendanceHistoryDay = {
  date: string;
  totalWork: string;
  totalBreak: string;
  workType?: string;
  records: AttendanceRecord[];
};

export type AttendanceHistoryResponse = {
  success: boolean;
  data: AttendanceHistoryDay[];
};

export const getAttendanceHistory = async (): Promise<AttendanceHistoryResponse> => {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const response = await apiRequest<{
    success: boolean;
    data: any[];
  }>(API_ENDPOINTS.history, {
    method: 'GET',
    token: session.access_token,
  });

  const mappedData = (response.data || []).map((day: any) => ({
    date: day.date,
    totalWork: day.totalWork || '00h 00m',
    totalBreak: day.totalBreak || '00h 00m',
    workType: day.workType || 'Present',
    records: (day.records || []).map((rec: any) => ({
      EmpCode: rec.empCode,
      EmpName: rec.empName,
      Punch: rec.Punch || rec.punch,
      PunchDatetime: rec.PunchDatetime || rec.punchDatetime,
      PunchTime: rec.PunchTime || rec.punchTime,
      Latitude: rec.latitude ? Number(rec.latitude) : 0,
      Longitude: rec.longitude ? Number(rec.longitude) : 0,
      Address: rec.address,
      Device: rec.device,
    })),
  }));

  return {
    success: response.success,
    data: mappedData,
  };
};

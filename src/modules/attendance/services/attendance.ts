import { API_ENDPOINTS } from '../config/api';
import { COMPANY } from '../config/company';
import { apiRequest, ApiError } from './apiClient';
import { getAuthSession } from './auth';

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
  status: string = 'Check IN',
  remark: string = '',
  deviceInfo: string = '',
): Promise<AttendanceResponse> => {
  const session = await getAuthSession();

  if (!session?.token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const formData = new FormData();
  formData.append('empCode', session.user.UserName);
  formData.append('status', status);
  formData.append('latitude', latitude.toString());
  formData.append('longitude', longitude.toString());
  formData.append('remark', remark);

  if (deviceInfo) {
    formData.append('device_info', deviceInfo);
  }

  return await apiRequest<AttendanceResponse>(API_ENDPOINTS.attendance, {
    method: 'POST',
    token: session.token,
    body: formData,
  });
};

export const punchOut = async (
  latitude: number,
  longitude: number,
): Promise<AttendanceResponse> => {
  const session = await getAuthSession();

  if (!session?.token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const payload = {
    empCode: session.user.UserName,
    latitude,
    longitude,
  };

  return await apiRequest<AttendanceResponse>(API_ENDPOINTS.checkout, {
    method: 'POST',
    token: session.token,
    body: payload,
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
};

export const getAttendanceStatus = async (empId?: number): Promise<AttendanceStatusResponse> => {
  const session = await getAuthSession();

  if (!session?.token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const fkEmpId = empId ?? Number(session.user.fkEmpId);

  if (!fkEmpId) {
    throw new Error('Employee ID is missing.');
  }

  return await apiRequest<AttendanceStatusResponse>(API_ENDPOINTS.status(fkEmpId), {
    method: 'GET',
    token: session.token,
  });
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

  if (!session?.token) {
    throw new Error('Authentication required. Please log in again.');
  }

  return await apiRequest<LiveLocationConfigResponse>(API_ENDPOINTS.liveLocationConfig, {
    method: 'GET',
    token: session.token,
  });
};

export const postLiveLocation = async ({
  latitude,
  longitude,
  status,
}: LiveLocationPayload): Promise<LiveLocationResponse> => {
  const session = await getAuthSession();

  if (!session?.token) {
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
      token: session.token,
      body: payload,
    },
  );
};

export const getAttendanceConfig = async (): Promise<AttendanceConfigResponse> => {
  const session = await getAuthSession();

  if (!session?.token) {
    throw new Error('Authentication required. Please log in again.');
  }

  return await apiRequest<AttendanceConfigResponse>(API_ENDPOINTS.config, {
    method: 'GET',
    token: session.token,
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

export const getDefaultGeolocations = (): GeolocationItem[] => [
  {
    pkGeoId: COMPANY.office.id,
    OfficeName: COMPANY.office.name,
    fkHLId: 0,
    Latitude: COMPANY.office.latitude,
    Longitude: COMPANY.office.longitude,
    RadiusMeters: COMPANY.office.radiusMeters,
    IsActive: true,
    CreatedAt: '',
    officeName: COMPANY.office.name,
  },
];

export const getGeolocations = async (): Promise<GeolocationResponse> => {
  const session = await getAuthSession();

  if (!session?.token) {
    throw new Error('Authentication required. Please log in again.');
  }

  // Regular employees cannot access the admin geolocations API.
  if (!isAdminRole(session.role)) {
    return {
      success: true,
      geolocations: getDefaultGeolocations(),
    };
  }

  try {
    return await apiRequest<GeolocationResponse>(API_ENDPOINTS.geolocations, {
      method: 'GET',
      token: session.token,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) {
      return {
        success: true,
        geolocations: getDefaultGeolocations(),
      };
    }

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
  records: AttendanceRecord[];
};

export type AttendanceHistoryResponse = {
  success: boolean;
  data: AttendanceHistoryDay[];
};

export const getAttendanceHistory = async (): Promise<AttendanceHistoryResponse> => {
  const session = await getAuthSession();

  if (!session?.token) {
    throw new Error('Authentication required. Please log in again.');
  }

  return await apiRequest<AttendanceHistoryResponse>(API_ENDPOINTS.history, {
    method: 'GET',
    token: session.token,
  });
};

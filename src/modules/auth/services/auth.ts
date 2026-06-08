import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../config/api';
import { AuthSession, AuthUser, LoginCredentials, LoginResponse } from '../types/auth';
import { apiRequest, ApiError } from './apiClient';
import { logApiError } from './logger';
import { isTokenExpired } from './sessionManager';

const AUTH_SESSION_KEY = '@attendance/auth-session';

export const normalizeAuthUser = (raw: Record<string, unknown>): AuthUser => ({
  pkUserId: String(raw.pkUserId ?? ''),
  UserName: String(raw.UserName ?? ''),
  Password: raw.Password ? String(raw.Password) : undefined,
  Answer: raw.Answer == null ? null : String(raw.Answer),
  Sync: String(raw.Sync ?? ''),
  SysDefined: raw.SysDefined as string | boolean,
  DateTimeStamp: String(raw.DateTimeStamp ?? ''),
  fkUserId: String(raw.fkUserId ?? ''),
  LastStatus: String(raw.LastStatus ?? ''),
  fkECId: raw.fkECId == null ? null : String(raw.fkECId),
  OwnRecords: raw.OwnRecords as string | boolean,
  OtherRecords: raw.OtherRecords as string | boolean,
  Mobile: String(raw.Mobile ?? raw.Phone ?? ''),
  fkEmpId: Number(raw.fkEmpId) || 0,
  ProfileImage: raw.ProfileImage == null ? null : String(raw.ProfileImage),
  Email: raw.Email == null ? null : String(raw.Email),
  Phone: raw.Phone == null ? null : String(raw.Phone),
  GeofencePoint: raw.GeofencePoint == null ? null : String(raw.GeofencePoint),
  AttendanceMode: raw.AttendanceMode ? String(raw.AttendanceMode) : undefined,
  fkLocationId:
    raw.fkLocationId == null || raw.fkLocationId === ''
      ? null
      : (raw.fkLocationId as string | number),
});

const normalizeAuthSession = (value: unknown): AuthSession | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const session = value as Partial<AuthSession> & { user?: Record<string, unknown> };

  if (!session.token || !session.refreshToken || !session.user) {
    return null;
  }

  const user =
    typeof session.user === 'object' && session.user !== null && 'UserName' in session.user
      ? normalizeAuthUser(session.user as Record<string, unknown>)
      : null;

  if (!user?.UserName) {
    return null;
  }

  return {
    token: session.token,
    refreshToken: session.refreshToken,
    role: session.role,
    user,
  };
};

export const saveAuthSession = async (session: AuthSession) => {
  await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  if (session.user.fkEmpId) {
    await AsyncStorage.setItem('@attendance/fk-emp-id', session.user.fkEmpId.toString());
  }
};

export const getAuthSession = async (): Promise<AuthSession | null> => {
  const storedSession = await AsyncStorage.getItem(AUTH_SESSION_KEY);

  if (!storedSession) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(storedSession);
    const session = normalizeAuthSession(parsedSession);

    if (!session) {
      await AsyncStorage.removeItem(AUTH_SESSION_KEY);
      await AsyncStorage.removeItem('@attendance/fk-emp-id');
      return null;
    }

    if (isTokenExpired(session.token)) {
      await clearAuthSession();
      return null;
    }

    return session;
  } catch (error) {
    logApiError('auth-session', 'Failed to parse stored session', error);
    await AsyncStorage.removeItem(AUTH_SESSION_KEY);
    await AsyncStorage.removeItem('@attendance/fk-emp-id');
    return null;
  }
};

export const clearAuthSession = async () => {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
  await AsyncStorage.removeItem('@attendance/fk-emp-id');
};

export const getStoredFkEmpId = async (): Promise<number | null> => {
  const empId = await AsyncStorage.getItem('@attendance/fk-emp-id');
  if (empId) {
    const parsed = parseInt(empId, 10);
    return isNaN(parsed) ? null : parsed;
  }

  const session = await getAuthSession();
  return session?.user?.fkEmpId || null;
};

export const loginWithCredentials = async (
  credentials: LoginCredentials,
): Promise<AuthSession> => {
  const email = credentials.Email.trim();
  const password = credentials.Password.trim();

  if (!email || !password) {
    throw new ApiError('Enter your email/username/mobile and password.');
  }

  const normalized = email.replace(/\s/g, '');
  const isMobileLogin = /^\+?\d{10,15}$/.test(normalized);
  const isEmailLogin = normalized.includes('@');

  const body = isMobileLogin
    ? { mobile: normalized, password }
    : isEmailLogin
      ? { email: normalized, password }
      : { username: normalized, password };

  try {
    const response = await apiRequest<LoginResponse>(API_ENDPOINTS.login, {
      method: 'POST',
      body,
    });

    if (!response?.success) {
      throw new ApiError('Login failed. Please check your credentials.');
    }

    if (!response.token || !response.refreshToken || !response.user) {
      throw new ApiError('Login response is missing required authentication data.');
    }

    const user = normalizeAuthUser(response.user);

    if (!user.UserName || !user.fkEmpId) {
      throw new ApiError('Login response is missing employee details.');
    }

    const session: AuthSession = {
      token: response.token,
      refreshToken: response.refreshToken,
      role: response.role,
      user,
    };

    await saveAuthSession(session);
    return session;
  } catch (error) {
    if (error instanceof ApiError) {
      logApiError(API_ENDPOINTS.login, error.message, error.data);
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Something went wrong while signing in.';

    logApiError(API_ENDPOINTS.login, message, error);
    throw new ApiError(message);
  }
};

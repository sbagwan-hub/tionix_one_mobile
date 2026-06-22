import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../../../config/api';
import { ApiError, apiRequest } from '../../../services/apiClient';
import { logApiError } from '../../../services/logger';
import { AuthSession, AuthUser, LoginCredentials, LoginResponse } from '../types/auth';
import { isTokenExpired } from '../../../services/sessionManager';

const AUTH_SESSION_KEY = '@attendance/auth-session';

export const normalizeAuthUser = (raw: Record<string, unknown>): AuthUser => {
  // Backend (Node/Drizzle) returns snake_case keys; fall back to legacy PascalCase keys
  const pkUserId = raw.pk_user_id ?? raw.pkUserId;
  const userName = raw.username ?? raw.UserName;
  const password = raw.password ?? raw.Password;
  const answer = raw.answer ?? raw.Answer;
  const sync = raw.sync ?? raw.Sync;
  const sysDefined = raw.sys_defined ?? raw.SysDefined;
  const dateTimeStamp = raw.date_time_stamp ?? raw.DateTimeStamp;
  const fkUserId = raw.fk_user_id ?? raw.fkUserId;
  const lastStatus = raw.last_status ?? raw.LastStatus;
  const fkECId = raw.fk_ec_id ?? raw.fkECId;
  const ownRecords = raw.own_records ?? raw.OwnRecords;
  const otherRecords = raw.other_records ?? raw.OtherRecords;
  const mobile = raw.mobile ?? raw.Mobile ?? raw.phone ?? raw.Phone;
  const fkEmpId = raw.fk_emp_id ?? raw.fkEmpId;
  const profileImage = raw.profile_image ?? raw.ProfileImage;
  const email = raw.email ?? raw.Email;
  const phone = raw.phone ?? raw.Phone;
  const geofencePoint = raw.geofence_point ?? raw.GeofencePoint;
  const attendanceMode = raw.attendance_mode ?? raw.AttendanceMode;
  const fkLocationId = raw.fk_location_id ?? raw.fkLocationId;
  const empCode = raw.emp_code ?? raw.empCode ?? raw.EmpCode;

  return {
    pkUserId: String(pkUserId ?? ''),
    UserName: String(userName ?? ''),
    Password: password ? String(password) : undefined,
    Answer: answer == null ? null : String(answer),
    Sync: String(sync ?? ''),
    SysDefined: sysDefined as string | boolean,
    DateTimeStamp: String(dateTimeStamp ?? ''),
    fkUserId: String(fkUserId ?? ''),
    LastStatus: String(lastStatus ?? ''),
    fkECId: fkECId == null ? null : String(fkECId),
    OwnRecords: ownRecords as string | boolean,
    OtherRecords: otherRecords as string | boolean,
    Mobile: String(mobile ?? ''),
    fkEmpId: Number(fkEmpId) || 0,
    ProfileImage: profileImage == null ? null : String(profileImage),
    Email: email == null ? null : String(email),
    Phone: phone == null ? null : String(phone),
    GeofencePoint: geofencePoint == null ? null : String(geofencePoint),
    AttendanceMode: attendanceMode ? String(attendanceMode) : undefined,
    fkLocationId:
      fkLocationId == null || fkLocationId === ''
        ? null
        : (fkLocationId as string | number),
    EmpCode: empCode == null ? null : String(empCode),
  };
};

const normalizeAuthSession = (value: unknown): AuthSession | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const session = value as Partial<AuthSession> & { user?: Record<string, unknown> };

  if (!session.access_token || !session.refresh_token || !session.user) {
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
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    role: session.role,
    user,
  };
};

export const saveAuthSession = async (session: AuthSession) => {
  await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  await AsyncStorage.setItem('@attendance/access-token', session.access_token);
  await AsyncStorage.setItem('@attendance/refresh-token', session.refresh_token);
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
      await AsyncStorage.removeItem('@attendance/access-token');
      await AsyncStorage.removeItem('@attendance/refresh-token');
      await AsyncStorage.removeItem('@attendance/fk-emp-id');
      return null;
    }

    if (isTokenExpired(session.access_token)) {
      await clearAuthSession();
      return null;
    }

    return session;
  } catch (error) {
    logApiError('auth-session', 'Failed to parse stored session', error);
    await AsyncStorage.removeItem(AUTH_SESSION_KEY);
    await AsyncStorage.removeItem('@attendance/access-token');
    await AsyncStorage.removeItem('@attendance/refresh-token');
    await AsyncStorage.removeItem('@attendance/fk-emp-id');
    return null;
  }
};

export const clearAuthSession = async () => {
  await AsyncStorage.removeItem(AUTH_SESSION_KEY);
  await AsyncStorage.removeItem('@attendance/access-token');
  await AsyncStorage.removeItem('@attendance/refresh-token');
  await AsyncStorage.removeItem('@attendance/fk-emp-id');
};

export const logout = async (): Promise<void> => {
  try {
    const session = await getAuthSession();
    if (session?.refresh_token) {
      await apiRequest(API_ENDPOINTS.logout, {
        method: 'POST',
        body: { refreshToken: session.refresh_token },
        skipAuth: true,
      });
    }
  } catch (error) {
    // Log error but continue with local cleanup
    console.error('Logout API call failed:', error);
  } finally {
    await clearAuthSession();
  }
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

  // Always send as username; backend resolves username, email, or mobile
  const body = { username: normalized, password };

  try {
    const response = await apiRequest<LoginResponse>(API_ENDPOINTS.login, {
      method: 'POST',
      body,
    });

    if (!response?.success) {
      throw new ApiError('Login failed. Please check your credentials.');
    }

    // Extract data from nested structure returned by ResponseBuilder
    const data = response.data || response;

    if (!data.access_token || !data.refresh_token || !data.user) {
      throw new ApiError('Login response is missing required authentication data.');
    }

    const user = normalizeAuthUser(data.user);

    if (!user.UserName || !user.fkEmpId) {
      throw new ApiError('Login response is missing employee details.');
    }

    const session: AuthSession = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      role: data.role,
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

export interface SecurityQuestion {
  id: number;
  question: string;
}

export const getSecurityQuestions = async (): Promise<SecurityQuestion[]> => {
  try {
    const response = await apiRequest<{ success: boolean; data: SecurityQuestion[] }>(
      API_ENDPOINTS.securityQuestions,
      {
        method: 'GET',
        skipAuth: true,
      },
    );

    if (!response?.success || !response?.data) {
      throw new ApiError('Failed to fetch security questions.');
    }

    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      logApiError(API_ENDPOINTS.securityQuestions, error.message, error.data);
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to fetch security questions.';

    logApiError(API_ENDPOINTS.securityQuestions, message, error);
    throw new ApiError(message);
  }
};

export const getEmployeeSecurityQuestion = async (
  username: string,
): Promise<{ question: string }> => {
  try {
    const response: any = await apiRequest<{ question: string }>(
      `${API_ENDPOINTS.employeeSecurityQuestion}?username=${encodeURIComponent(username)}`,
      {
        method: 'GET',
        skipAuth: true,
      },
    );

    if (!response?.success || !response?.data) {
      throw new ApiError('Employee not found.');
    }

    return response.data;
  } catch (error) {
    if (error instanceof ApiError) {
      logApiError(API_ENDPOINTS.employeeSecurityQuestion, error.message, error.data);
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to fetch employee security question.';

    logApiError(API_ENDPOINTS.employeeSecurityQuestion, message, error);
    throw new ApiError(message);
  }
};

export interface ForgotPasswordCredentials {
  username: string;
  answer: string;
}

export const validateForgotPasswordCredentials = async (
  credentials: ForgotPasswordCredentials,
): Promise<boolean> => {
  try {
    const response = await apiRequest<{ success: boolean }>(
      API_ENDPOINTS.forgotPasswordValidate,
      {
        method: 'POST',
        body: credentials,
        skipAuth: true,
      },
    );

    if (!response?.success) {
      throw new ApiError('Invalid credentials. Please check your information.');
    }

    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      logApiError(API_ENDPOINTS.forgotPasswordValidate, error.message, error.data);
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to validate credentials.';

    logApiError(API_ENDPOINTS.forgotPasswordValidate, message, error);
    throw new ApiError(message);
  }
};

export interface ResetPasswordCredentials {
  username: string;
  answer: string;
  new_password: string;
}

export const resetPassword = async (credentials: ResetPasswordCredentials): Promise<boolean> => {
  try {
    const response = await apiRequest<{ success: boolean }>(
      API_ENDPOINTS.forgotPasswordReset,
      {
        method: 'POST',
        body: credentials,
        skipAuth: true,
      },
    );

    if (!response?.success) {
      throw new ApiError('Failed to reset password. Please try again.');
    }

    return true;
  } catch (error) {
    if (error instanceof ApiError) {
      logApiError(API_ENDPOINTS.forgotPasswordReset, error.message, error.data);
      throw error;
    }

    const message =
      error instanceof Error ? error.message : 'Failed to reset password.';

    logApiError(API_ENDPOINTS.forgotPasswordReset, message, error);
    throw new ApiError(message);
  }
};

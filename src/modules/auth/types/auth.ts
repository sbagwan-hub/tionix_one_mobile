export type AuthUser = {
  pkUserId: string;
  UserName: string;
  Password?: string;
  Answer: string | null;
  Sync: string;
  SysDefined: string | boolean;
  DateTimeStamp: string;
  fkUserId: string;
  LastStatus: string;
  fkECId: string | null;
  OwnRecords: string | boolean;
  OtherRecords: string | boolean;
  Mobile: string;
  fkEmpId: number;
  ProfileImage: string | null;
  Email: string | null;
  Phone: string | null;
  GeofencePoint?: string | null;
  AttendanceMode?: string;
  fkLocationId?: string | number | null;
  EmpCode?: string | null;
};

export type LoginResponse = {
  success: boolean;
  message?: string;
  timestamp?: string;
  module?: string;
  data?: {
    access_token: string;
    refresh_token: string;
    role?: string;
    user: Record<string, unknown>;
  };
  // Flat structure for backward compatibility
  access_token?: string;
  refresh_token?: string;
  role?: string;
  user?: Record<string, unknown>;
};

export type LoginCredentials = {
  Email: string;
  Password: string;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  role?: string;
  user: AuthUser;
};

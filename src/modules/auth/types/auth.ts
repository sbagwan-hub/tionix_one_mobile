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
};

export type LoginResponse = {
  success: boolean;
  token: string;
  refreshToken: string;
  role?: string;
  user: Record<string, unknown>;
};

export type LoginCredentials = {
  Email: string;
  Password: string;
};

export type AuthSession = {
  token: string;
  refreshToken: string;
  role?: string;
  user: AuthUser;
};

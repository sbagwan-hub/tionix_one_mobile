import { Platform } from 'react-native';
import { API_ENDPOINTS } from '../../../config/api';
import { apiRequest } from '../../../services/apiClient';
import { getAuthSession, saveAuthSession } from '../../auth/services/auth';
import type { AuthSession } from '../../auth/types/auth';

export type EmployeeProfile = {
  pkUserId: string;
  userName: string;
  fkEmpId: number;
  email: string | null;
  phone: string | null;
  profileImageUrl: string | null;
  empCode: string | null;
  // Additional fields from sal_employee
  doj: string | null;
  dob: string | null;
  bloodGroup: string | null;
  aadhar: string | null;
  panNo: string | null;
  permanentAddress: string | null;
  presentAddress: string | null;
};

type ProfileResponse = {
  success: boolean;
  profile?: EmployeeProfile;
  data?: {
    profile?: EmployeeProfile;
  };
};

export type UpdateEmployeeProfilePayload = Partial<{
  userName: string;
  email: string | null;
  phone: string | null;
  profileImageUrl: string | null;
}>;

export const getProfileFromAuthSession = (session: AuthSession): EmployeeProfile => ({
  pkUserId: session.user.pkUserId,
  userName: session.user.UserName,
  fkEmpId: session.user.fkEmpId,
  email: session.user.Email,
  phone: session.user.Phone ?? session.user.Mobile,
  profileImageUrl: session.user.ProfileImage,
  empCode: session.user.EmpCode || null,
  // Additional fields from sal_employee (not available in auth session)
  doj: null,
  dob: null,
  bloodGroup: null,
  aadhar: null,
  panNo: null,
  permanentAddress: null,
  presentAddress: null,
});

export const getEmployeeProfile = async (): Promise<EmployeeProfile> => {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const fkEmpId = Number(session.user.fkEmpId);

  if (!fkEmpId) {
    throw new Error('Employee ID is missing from the login session.');
  }

  const response = await apiRequest<ProfileResponse>(API_ENDPOINTS.profile(fkEmpId), {
    method: 'GET',
  });

  const profile = response?.data?.profile || response?.profile;

  if (!profile) {
    throw new Error('Unable to fetch employee profile from server.');
  }

  // Sync to local session
  session.user.UserName = profile.userName;
  session.user.Email = profile.email;
  session.user.Phone = profile.phone;
  session.user.ProfileImage = profile.profileImageUrl;
  session.user.EmpCode = profile.empCode;
  await saveAuthSession(session);

  return profile;
};

export const updateEmployeeProfile = async (
  payload: UpdateEmployeeProfilePayload,
): Promise<EmployeeProfile> => {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const fkEmpId = Number(session.user.fkEmpId);

  if (!fkEmpId) {
    throw new Error('Employee ID is missing from the login session.');
  }

  const response = await apiRequest<ProfileResponse>(API_ENDPOINTS.profile(fkEmpId), {
    method: 'PUT',
    body: payload,
  });

  const profile = response?.data?.profile || response?.profile;

  if (!profile) {
    throw new Error('Unable to update employee profile.');
  }

  // Sync to local session
  session.user.UserName = profile.userName;
  session.user.Email = profile.email;
  session.user.Phone = profile.phone;
  session.user.ProfileImage = profile.profileImageUrl;
  session.user.EmpCode = profile.empCode;
  await saveAuthSession(session);

  return profile;
};

export const uploadProfileImage = async (
  uri: string,
  fileName?: string,
  type?: string,
): Promise<EmployeeProfile> => {
  const session = await getAuthSession();

  if (!session?.access_token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const formData = new FormData();
  
  // Format the file URI properly for React Native upload
  const formattedUri = Platform.OS === 'android' ? uri : uri.replace('file://', '');
  
  formData.append('profileImage', {
    uri: formattedUri,
    name: fileName || `profile_${Date.now()}.jpg`,
    type: type || 'image/jpeg',
  } as any);

  const response = await apiRequest<ProfileResponse>(API_ENDPOINTS.profileImage, {
    method: 'POST',
    body: formData,
  });

  const profile = response?.data?.profile || response?.profile;

  if (!profile) {
    throw new Error('Unable to upload profile image.');
  }

  // Sync to local session
  session.user.UserName = profile.userName;
  session.user.Email = profile.email;
  session.user.Phone = profile.phone;
  session.user.ProfileImage = profile.profileImageUrl;
  session.user.EmpCode = profile.empCode;
  await saveAuthSession(session);

  return profile;
};

import { Platform } from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { apiRequest } from './apiClient';
import { getAuthSession, saveAuthSession } from './auth';
import type { AuthSession } from '../types/auth';

export type EmployeeProfile = {
  pkUserId: string;
  userName: string;
  fkEmpId: number;
  email: string | null;
  phone: string | null;
  profileImageUrl: string | null;
};

type ProfileResponse = {
  success: boolean;
  profile: EmployeeProfile;
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
});

export const getEmployeeProfile = async (): Promise<EmployeeProfile> => {
  const session = await getAuthSession();

  if (!session?.token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const fkEmpId = Number(session.user.fkEmpId);

  if (!fkEmpId) {
    throw new Error('Employee ID is missing from the login session.');
  }

  try {
    const response = await apiRequest<ProfileResponse>(API_ENDPOINTS.profile(fkEmpId), {
      method: 'GET',
      token: session.token,
    });

    if (!response.success || !response.profile) {
      return getProfileFromAuthSession(session);
    }

    // Sync to local session
    session.user.UserName = response.profile.userName;
    session.user.Email = response.profile.email;
    session.user.Phone = response.profile.phone;
    session.user.ProfileImage = response.profile.profileImageUrl;
    await saveAuthSession(session);

    return response.profile;
  } catch {
    return getProfileFromAuthSession(session);
  }
};

export const updateEmployeeProfile = async (
  payload: UpdateEmployeeProfilePayload,
): Promise<EmployeeProfile> => {
  const session = await getAuthSession();

  if (!session?.token) {
    throw new Error('Authentication required. Please log in again.');
  }

  const fkEmpId = Number(session.user.fkEmpId);

  if (!fkEmpId) {
    throw new Error('Employee ID is missing from the login session.');
  }

  const response = await apiRequest<ProfileResponse>(API_ENDPOINTS.profile(fkEmpId), {
    method: 'PUT',
    token: session.token,
    body: payload,
  });

  if (!response.success || !response.profile) {
    throw new Error('Unable to update employee profile.');
  }

  // Sync to local session
  session.user.UserName = response.profile.userName;
  session.user.Email = response.profile.email;
  session.user.Phone = response.profile.phone;
  session.user.ProfileImage = response.profile.profileImageUrl;
  await saveAuthSession(session);

  return response.profile;
};

export const uploadProfileImage = async (
  uri: string,
  fileName?: string,
  type?: string,
): Promise<EmployeeProfile> => {
  const session = await getAuthSession();

  if (!session?.token) {
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
    token: session.token,
    body: formData,
  });

  if (!response.success || !response.profile) {
    throw new Error('Unable to upload profile image.');
  }

  // Sync to local session
  session.user.UserName = response.profile.userName;
  session.user.Email = response.profile.email;
  session.user.Phone = response.profile.phone;
  session.user.ProfileImage = response.profile.profileImageUrl;
  await saveAuthSession(session);

  return response.profile;
};

import { apiRequest } from '../../../services/apiClient';
import { getAuthSession } from '../../auth/services/auth';

export interface PersonalWorkRequest {
  pk_pw_id: number;
  request_date: string;
  fk_emp_id: number;
  leaving_time: string;
  return_time: string;
  break_time: number;
  reason: string;
  remarks: string;
  sync: string;
  date_timestamp: string;
  last_status: string;
  authorize: boolean;
  a_timestamp: string | null;
  fk_a_user_id: number | null;
  employee_name: string | null;
  emp_code: string | null;
  user_name: string | null;
  authorized_by_name: string | null;
}

export interface PersonalWorkResponse {
  success: boolean;
  data?: any;
  message?: string;
}

const PERSONAL_WORK_ENDPOINTS = {
  LIST: '/api/mobile/personal-work',
  CREATE: '/api/mobile/personal-work',
  GET_BY_ID: (id: number) => `/api/mobile/personal-work/${id}`,
  DELETE: (id: number) => `/api/mobile/personal-work/${id}`,
};

export async function applyForPersonalWork(payload: {
  leaving_time: string;
  return_time: string;
  break_time: number;
  reason: string;
  remarks?: string;
}): Promise<PersonalWorkResponse> {
  const session = await getAuthSession();
  if (!session?.user?.fkEmpId) {
    throw new Error('Employee ID not found in session');
  }

  const response = await apiRequest<{ pk_pw_id: number }>(
    PERSONAL_WORK_ENDPOINTS.CREATE,
    {
      method: 'POST',
      body: {
        request_date: new Date().toISOString(),
        fk_emp_id: Number(session.user.fkEmpId),
        leaving_time: payload.leaving_time,
        return_time: payload.return_time,
        break_time: payload.break_time,
        reason: payload.reason,
        remarks: payload.remarks || '',
      },
      token: session?.access_token,
    }
  );

  return {
    success: true,
    data: response,
  };
}

export async function getPersonalWorkHistory(
  page: number = 1,
  pageSize: number = 50
): Promise<any> {
  const session = await getAuthSession();
  const params = new URLSearchParams({
    own_record: 'true',
    page: String(page),
    page_size: String(pageSize),
  });

  const response = await apiRequest<{ success: boolean, data: any }>(
    `${PERSONAL_WORK_ENDPOINTS.LIST}?${params.toString()}`,
    {
      method: 'GET',
      token: session?.access_token,
    }
  );

  return response.data;
}

export async function deletePersonalWorkRequest(id: number): Promise<boolean> {
  const session = await getAuthSession();
  const response = await apiRequest<{ success: boolean, data: { deleted: boolean } }>(
    PERSONAL_WORK_ENDPOINTS.DELETE(id),
    {
      method: 'DELETE',
      token: session?.access_token,
    }
  );

  return response.data.deleted;
}

export async function getPersonalWorkDetails(id: number): Promise<PersonalWorkRequest> {
  const session = await getAuthSession();
  const response = await apiRequest<{ success: boolean, data: PersonalWorkRequest }>(
    PERSONAL_WORK_ENDPOINTS.GET_BY_ID(id),
    {
      method: 'GET',
      token: session?.access_token,
    }
  );

  return response.data;
}

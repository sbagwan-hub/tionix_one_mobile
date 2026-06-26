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
  UPDATE: (id: number) => `/api/mobile/personal-work/${id}`,
  GET_BY_ID: (id: number) => `/api/mobile/personal-work/${id}`,
  DELETE: (id: number) => `/api/mobile/personal-work/${id}`,
  SHIFT_END: '/api/mobile/personal-work/shift-end',
};

export async function applyForPersonalWork(payload: {
  request_date?: string;
  leaving_time: string;
  return_time: string;
  reason: string;
  remarks?: string;
}): Promise<PersonalWorkResponse> {
  const session = await getAuthSession();
  if (!session?.user?.fkEmpId) {
    throw new Error('Employee ID not found in session');
  }

  // Use caller-supplied request_date (local, no timezone) or build one from today.
  const today = new Date();
  const todayLocal = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}T00:00:00`;
  const requestDate = payload.request_date ?? todayLocal;

  const response = await apiRequest<{ pk_pw_id: number }>(
    PERSONAL_WORK_ENDPOINTS.CREATE,
    {
      method: 'POST',
      body: {
        request_date: requestDate,
        fk_emp_id: Number(session.user.fkEmpId),
        leaving_time: payload.leaving_time,
        return_time: payload.return_time,
        reason: payload.reason,
        remarks: payload.remarks || '',
      },
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
    }
  );

  return response.data.deleted;
}

export async function getPersonalWorkDetails(id: number): Promise<PersonalWorkRequest> {
  const response = await apiRequest<{ success: boolean, data: PersonalWorkRequest }>(
    PERSONAL_WORK_ENDPOINTS.GET_BY_ID(id),
    {
      method: 'GET',
    }
  );

  return response.data;
}

/**
 * Returns the employee's shift end time as "HH:MM" (24-hour) string.
 * Returns null if the employee has no shift assigned.
 */
export async function getShiftEndTime(
  fkEmpId: number
): Promise<{ shiftEnd: string | null; shift?: string }> {
  const params = new URLSearchParams({ fk_emp_id: String(fkEmpId) });
  const response = await apiRequest<{ success: boolean; data: { shiftEnd: string | null; shift?: string } }>(
    `${PERSONAL_WORK_ENDPOINTS.SHIFT_END}?${params.toString()}`,
    { method: 'GET' }
  );
  return response.data;
}

export async function updatePersonalWork(
  id: number,
  payload: {
    leaving_time: string;
    return_time: string;
    reason: string;
    remarks?: string;
    fk_emp_id: number;
    request_date: string;
  }
): Promise<PersonalWorkResponse> {
  const response = await apiRequest<{ updated: boolean }>(
    PERSONAL_WORK_ENDPOINTS.UPDATE(id),
    {
      method: 'PUT',
      body: {
        leaving_time: payload.leaving_time,
        return_time: payload.return_time,
        reason: payload.reason,
        remarks: payload.remarks || '',
        fk_emp_id: payload.fk_emp_id,
        request_date: payload.request_date,
      },
    }
  );
  return { success: true, data: response };
}


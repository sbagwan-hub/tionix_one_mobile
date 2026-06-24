import { apiRequest } from '../../../services/apiClient';
import { getAuthSession } from '../../auth/services/auth';
import { EmployeeOption } from '../../loan-request/services/loan-request.service';

export interface ComplaintEmployee {
  pk_emp_id: number;
  employee: string;
  emp_code: string;
}

export interface ComplaintAttachment {
  pk_att_id: number;
  file_name: string;
  file_path: string;
  doc_type: string;
  uploaded_at: string;
}

export type ComplaintType = 'complaint' | 'suggestion' | 'feedback' | 'appraisal';

export const COMPLAINT_TYPE_LABELS: Record<ComplaintType, string> = {
  complaint: 'Complaint',
  suggestion: 'Suggestion',
  feedback: 'Feedback',
  appraisal: 'Appraisal',
};

export const COMPLAINT_TYPE_COLORS: Record<ComplaintType, { bg: string; text: string; border: string }> = {
  complaint: { bg: 'rgba(239, 68, 68, 0.08)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.2)' },
  suggestion: { bg: 'rgba(59, 130, 246, 0.08)', text: '#3B82F6', border: 'rgba(59, 130, 246, 0.2)' },
  feedback: { bg: 'rgba(16, 185, 129, 0.08)', text: '#10B981', border: 'rgba(16, 185, 129, 0.2)' },
  appraisal: { bg: 'rgba(245, 158, 11, 0.08)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.2)' },
};

export const COMPLAINT_TYPE_ICONS: Record<ComplaintType, string> = {
  complaint: 'alert-circle-outline',
  suggestion: 'bulb-outline',
  feedback: 'chatbubble-ellipses-outline',
  appraisal: 'ribbon-outline',
};

export interface Complaint {
  pk_com_id: string;
  title: string;
  description: string | null;
  type: ComplaintType;
  created_at: string;
  employees: ComplaintEmployee[];
  attachments: ComplaintAttachment[];
}

export interface CreateComplaintPayload {
  title: string;
  description?: string;
  type?: ComplaintType;
  employee_ids: number[];
  attachments?: {
    file_name: string;
    file_path: string;
    doc_type: string;
  }[];
}

const COMPLAINTS_ENDPOINTS = {
  LIST: '/api/mobile/sal-comp-employees',
  CREATE: '/api/mobile/sal-comp-employees',
  GET_BY_ID: (id: string) => `/api/mobile/sal-comp-employees/${id}`,
  UPDATE: (id: string) => `/api/mobile/sal-comp-employees/${id}`,
  DELETE: (id: string) => `/api/mobile/sal-comp-employees/${id}`,
  EMPLOYEES: '/api/mobile/loan-requests/employees',
};

export async function getComplaints(
  page: number = 1,
  pageSize: number = 50,
  title?: string
): Promise<Complaint[]> {
  const session = await getAuthSession();
  const params = new URLSearchParams({
    page: String(page),
    page_size: String(pageSize),
  });
  if (title) {
    params.append('title', title);
  }

  const response = await apiRequest<{ success: boolean; data: Complaint[] }>(
    `${COMPLAINTS_ENDPOINTS.LIST}?${params.toString()}`,
    {
      method: 'GET',
      token: session?.access_token,
    }
  );

  return response.data || [];
}

export async function getComplaintDetails(id: string): Promise<Complaint> {
  const session = await getAuthSession();
  const response = await apiRequest<{ success: boolean; data: Complaint }>(
    COMPLAINTS_ENDPOINTS.GET_BY_ID(id),
    {
      method: 'GET',
      token: session?.access_token,
    }
  );

  return response.data;
}

export async function createComplaint(payload: CreateComplaintPayload): Promise<string> {
  const session = await getAuthSession();
  
  // Generate a unique 8-digit numeric ID on client side
  const pk_com_id = Date.now() % 100000000;

  const response = await apiRequest<{ success: boolean; data: { pk_com_id: string } }>(
    COMPLAINTS_ENDPOINTS.CREATE,
    {
      method: 'POST',
      body: {
        pk_com_id,
        ...payload,
      },
      token: session?.access_token,
    }
  );

  return response.data.pk_com_id;
}

export async function updateComplaint(id: string, payload: Partial<CreateComplaintPayload>): Promise<void> {
  const session = await getAuthSession();
  await apiRequest<void>(
    COMPLAINTS_ENDPOINTS.UPDATE(id),
    {
      method: 'PUT',
      body: payload,
      token: session?.access_token,
    }
  );
}

export async function deleteComplaint(id: string): Promise<void> {
  const session = await getAuthSession();
  await apiRequest<void>(
    COMPLAINTS_ENDPOINTS.DELETE(id),
    {
      method: 'DELETE',
      token: session?.access_token,
    }
  );
}

export async function getEmployeeList(): Promise<EmployeeOption[]> {
  const session = await getAuthSession();
  const response = await apiRequest<{ success: boolean; data: EmployeeOption[] }>(
    COMPLAINTS_ENDPOINTS.EMPLOYEES,
    {
      method: 'GET',
      token: session?.access_token,
    }
  );
  return response.data || [];
}

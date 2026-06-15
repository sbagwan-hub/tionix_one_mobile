import { apiRequest } from './apiClient';

export interface ShiftTiming {
  pk_st_id: number;
  shift: string;
  s_work: string;
  e_work: string;
  t_work: number;
  s_break: string;
  e_break: string;
  t_break: number;
  sd: boolean;
  sync: string;
  sys_defined: boolean;
  date_time_stamp: string;
  fk_user_id: string;
  last_status: string;
}

export const shiftTimingService = {
  getAll: async (): Promise<ShiftTiming[]> => {
    return apiRequest<ShiftTiming[]>('/mobile/shift-timing');
  },

  getById: async (id: number): Promise<ShiftTiming> => {
    return apiRequest<ShiftTiming>(`/mobile/shift-timing/${id}`);
  },
};

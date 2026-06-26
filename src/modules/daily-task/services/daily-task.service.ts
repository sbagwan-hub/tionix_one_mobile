import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_ENDPOINTS } from '../../../config/api';
import { apiRequest, ApiError } from '../../../services/apiClient';
import { getAuthSession } from '../../auth/services/auth';
import { DailyTask, CreateTaskDto, UpdateTaskDto, TaskStatus } from './types';

export type { CreateTaskDto, UpdateTaskDto, TaskStatus, DailyTask };

const taskStorageKey = (fkEmpId: number) => `@attendance/daily-tasks/${fkEmpId}`;

const readLocalTasks = async (fkEmpId: number): Promise<DailyTask[]> => {
  if (!fkEmpId) {
    return [];
  }

  try {
    const stored = await AsyncStorage.getItem(taskStorageKey(fkEmpId));
    if (!stored) {
      return [];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
};

const writeLocalTasks = async (fkEmpId: number, items: DailyTask[]) => {
  if (!fkEmpId) {
    return;
  }

  await AsyncStorage.setItem(taskStorageKey(fkEmpId), JSON.stringify(items));
};

const appendLocalTask = async (fkEmpId: number, item: DailyTask) => {
  const existing = await readLocalTasks(fkEmpId);
  await writeLocalTasks(fkEmpId, [item, ...existing.filter(entry => entry.pk_task_id !== item.pk_task_id)]);
};

const updateLocalTask = async (fkEmpId: number, taskId: number, updates: Partial<DailyTask>) => {
  const existing = await readLocalTasks(fkEmpId);
  const updated = existing.map(task => 
    task.pk_task_id === taskId ? { ...task, ...updates } : task
  );
  await writeLocalTasks(fkEmpId, updated);
};

const deleteLocalTask = async (fkEmpId: number, taskId: number) => {
  const existing = await readLocalTasks(fkEmpId);
  const filtered = existing.filter(task => task.pk_task_id !== taskId);
  await writeLocalTasks(fkEmpId, filtered);
};

const getEmployeeId = async (): Promise<number> => {
  try {
    const session = await getAuthSession();
    return Number(session?.user?.fkEmpId) || 0;
  } catch {
    return 0;
  }
};

export const getDailyTasks = async (): Promise<DailyTask[]> => {
  const fkEmpId = await getEmployeeId();
  const localTasks = await readLocalTasks(fkEmpId);

  try {
    const response = await apiRequest<any>(API_ENDPOINTS.dailyTasks, {
      method: 'GET',
    });

    const rawTasks = response.data?.data || [];
    const tasks: DailyTask[] = rawTasks.map((t: any) => ({
      pk_task_id: t.pk_obt_id,
      task_name: t.task,
      reaching_date: t.task_date,
      reaching_time: t.task_time || '',
      status: t.status,
      date_time_stamp: t.task_date,
      fk_user_id: t.fk_ob_id,
    }));

    await writeLocalTasks(fkEmpId, tasks);
    return tasks;
  } catch (error) {
    console.error('Error fetching daily tasks:', error);
    return localTasks;
  }
};

export const createDailyTask = async (payload: CreateTaskDto): Promise<DailyTask> => {
  const fkEmpId = await getEmployeeId();

  try {
    let formattedTaskTime = payload.reaching_time;
    if (payload.reaching_time && /^\d{2}:\d{2}$/.test(payload.reaching_time)) {
      const datePart = (payload.reaching_date || new Date().toISOString()).split('T')[0];
      formattedTaskTime = `${datePart}T${payload.reaching_time}:00`;
    }

    const response = await apiRequest<any>(API_ENDPOINTS.dailyTasks, {
      method: 'POST',
      body: {
        task: payload.task_name,
        task_date: payload.reaching_date,
        task_time: formattedTaskTime,
        status: payload.status,
        fk_ob_id: payload.fk_user_id,
      },
    });
    const t = response.data;
    const newTask: DailyTask = {
      pk_task_id: t.pk_obt_id,
      task_name: t.task,
      reaching_date: t.task_date,
      reaching_time: t.task_time || '',
      status: t.status,
      date_time_stamp: t.task_date,
      fk_user_id: t.fk_ob_id,
    };
    
    await appendLocalTask(fkEmpId, newTask);
    return newTask;
  } catch (error) {
    throw error;
  }
};

export const updateDailyTask = async (taskId: number, payload: UpdateTaskDto): Promise<DailyTask> => {
  const fkEmpId = await getEmployeeId();

  try {
    const body: any = {};
    if (payload.task_name !== undefined) body.task = payload.task_name;
    if (payload.reaching_date !== undefined) body.task_date = payload.reaching_date;
    if (payload.reaching_time !== undefined) {
      let formattedTaskTime = payload.reaching_time;
      if (/^\d{2}:\d{2}$/.test(payload.reaching_time)) {
        const fullDate = payload.reaching_date || new Date().toISOString();
        const datePart = fullDate.split('T')[0];
        formattedTaskTime = `${datePart}T${payload.reaching_time}:00`;
      }
      body.task_time = formattedTaskTime;
    }
    if (payload.status !== undefined) body.status = payload.status;
    if (payload.fk_user_id !== undefined) body.fk_ob_id = payload.fk_user_id;

    const response = await apiRequest<any>(API_ENDPOINTS.dailyTask(taskId), {
      method: 'PUT',
      body,
    });
    const t = response.data;
    const updated: DailyTask = {
      pk_task_id: t.pk_obt_id,
      task_name: t.task,
      reaching_date: t.task_date,
      reaching_time: t.task_time || '',
      status: t.status,
      date_time_stamp: t.task_date,
      fk_user_id: t.fk_ob_id,
    };
    
    await updateLocalTask(fkEmpId, taskId, updated);
    return updated;
  } catch (error) {
    throw error;
  }
};

export const deleteDailyTask = async (taskId: number): Promise<void> => {
  const fkEmpId = await getEmployeeId();

  try {
    await apiRequest<any>(API_ENDPOINTS.dailyTask(taskId), {
      method: 'DELETE',
    });
    await deleteLocalTask(fkEmpId, taskId);
  } catch (error) {
    throw error;
  }
};

export const updateTaskStatus = async (taskId: number, status: TaskStatus): Promise<DailyTask> => {
  return updateDailyTask(taskId, { status });
};

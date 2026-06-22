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

    const tasks = response.data?.data || [];
    
    if (tasks.length > 0) {
      await writeLocalTasks(fkEmpId, tasks);
      return tasks;
    }

    return localTasks;
  } catch (error) {
    console.error('Error fetching daily tasks:', error);
    return localTasks;
  }
};

export const createDailyTask = async (payload: CreateTaskDto): Promise<DailyTask> => {
  const fkEmpId = await getEmployeeId();

  try {
    const response = await apiRequest<any>(API_ENDPOINTS.dailyTasks, {
      method: 'POST',
      body: payload,
    });
    const newTask = response.data;
    
    await appendLocalTask(fkEmpId, newTask);
    return newTask;
  } catch (error) {
    throw error;
  }
};

export const updateDailyTask = async (taskId: number, payload: UpdateTaskDto): Promise<DailyTask> => {
  const fkEmpId = await getEmployeeId();

  try {
    const response = await apiRequest<any>(API_ENDPOINTS.dailyTask(taskId), {
      method: 'PUT',
      body: payload,
    });
    const updated = response.data;
    
    await updateLocalTask(fkEmpId, taskId, payload);
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

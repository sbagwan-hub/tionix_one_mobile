export type TaskStatus = 'Pending' | 'Canceled' | 'Finished';

export interface DailyTask {
  pk_task_id: number;
  task_name: string;
  reaching_date: string;
  reaching_time: string;
  status: TaskStatus;
  date_time_stamp: string;
  fk_user_id: number;
  username?: string;
}

export interface CreateTaskDto {
  task_name: string;
  reaching_date: string;
  reaching_time: string;
  status: TaskStatus;
  fk_user_id: number;
}

export interface UpdateTaskDto {
  task_name?: string;
  reaching_date?: string;
  reaching_time?: string;
  status?: TaskStatus;
  fk_user_id?: number;
}

export interface SystemVersion {
  version: string;
}

export interface HealthStatus {
  status: 'green' | 'red';
  elapsed: string;
  error?: string;
}

export interface DocEngineStatus extends HealthStatus {
  type: string;
  cluster_name?: string;
  number_of_nodes?: number;
  number_of_data_nodes?: number;
  active_primary_shards?: number;
  active_shards?: number;
  relocating_shards?: number;
  initializing_shards?: number;
  unassigned_shards?: number;
  delayed_unassigned_shards?: number;
  number_of_pending_tasks?: number;
  task_max_waiting_in_queue_millis?: number;
  active_shards_percent_as_number?: number;
  timed_out?: boolean;
}

export interface StorageStatus extends HealthStatus {
  storage: string;
}

export interface DatabaseStatus extends HealthStatus {
  database: string;
}

export interface RedisStatus extends HealthStatus {
  redis: string;
}

export interface TaskExecutorHeartbeat {
  [executorId: string]: Array<{
    timestamp: number;
    status: string;
    boot_at?: string;
    current?: {
      id: string;
      task_type: string;
      name: string;
      size: number;
      [key: string]: any;
    } | null;
    done: number;
    failed: number;
    pending: number;
    lag: number;
    now: string;
    [key: string]: any;
  }>;
}

export interface SystemStatus {
  doc_engine: DocEngineStatus;
  storage: StorageStatus;
  database: DatabaseStatus;
  redis: RedisStatus;
  task_executor_heartbeats: TaskExecutorHeartbeat;
}

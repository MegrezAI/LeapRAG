export const TASK_STATES = {
  SUBMITTED: 'submitted',
  WORKING: 'working',
  INPUT_REQUIRED: 'input-required',
  COMPLETED: 'completed',
  CANCELED: 'canceled',
  FAILED: 'failed',
  UNKNOWN: 'unknown'
} as const;

export type TaskState = (typeof TASK_STATES)[keyof typeof TASK_STATES];

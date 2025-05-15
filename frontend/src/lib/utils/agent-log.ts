import { type TaskState, TASK_STATES } from '../constants/agent-log';

export const getStateVariant = (state: TaskState) => {
  switch (state) {
    case TASK_STATES.FAILED:
      return 'destructive';
    case TASK_STATES.COMPLETED:
      return 'success';
    default:
      return 'secondary';
  }
};

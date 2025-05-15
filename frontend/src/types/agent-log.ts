import { type TaskState } from '@/lib/constants/agent-log';

export interface AgentLogPart {
  type: string;
  text: string;
  metadata: any | null;
}

export interface AgentLogMessage {
  role: 'user' | 'agent';
  parts: AgentLogPart[];
  metadata: any | null;
}

export interface AgentLogArtifact {
  name: string | null;
  description: string | null;
  parts: AgentLogPart[];
  metadata: any | null;
  index: number;
  append: boolean;
  lastChunk: any | null;
}

export interface AgentLog {
  id: string;
  agent_id: string;
  session_id: string;
  state: TaskState;
  message: AgentLogMessage;
  timestamp: string;
  artifacts: AgentLogArtifact[];
  history: AgentLogMessage[];
  task_metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface AgentLogListParams {
  agent_id: string;
  start_time?: string;
  end_time?: string;
  page?: number;
  page_size?: number;
  orderby?: string;
  desc?: boolean;
}

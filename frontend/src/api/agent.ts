import { GET, POST, PUT, DELETE } from '@/lib/utils/request';
import {
  type AgentCreateSchema,
  type AgentUpdateSchema,
  type SendMessageSchema
} from '@/lib/schema/agent';
import { type Agent } from '@/types/agent';
import { type PaginationResponse } from '@/types/helpers';
import { type AgentLog, type AgentLogListParams } from '@/types/agent-log';

const AGENT_PREFIX = '/rag/agent';

// 获取应用列表
export const getAgentsApi = () => GET<Agent[]>(`${AGENT_PREFIX}`);

// 创建应用
export const createAgentApi = (data: AgentCreateSchema) => POST<Agent>(`${AGENT_PREFIX}`, data);

// 获取应用详情
export const getAgentApi = (agentId: string) => GET<Agent>(`${AGENT_PREFIX}/${agentId}`);

// 更新应用
export const updateAgentApi = (agentId: string, data: AgentUpdateSchema) =>
  PUT<Agent>(`${AGENT_PREFIX}/${agentId}`, data);

// 删除应用
export const deleteAgentApi = (agentId: string) => DELETE(`${AGENT_PREFIX}/${agentId}`);

// 发送消息
export const sendMessageApi = (agentId: string, data: SendMessageSchema) =>
  POST<{ result: any }>(`${AGENT_PREFIX}/${agentId}/send-message`, data);

// 获取应用日志列表
export const getAgentLogsApi = (params: AgentLogListParams) =>
  GET<PaginationResponse<AgentLog>>(`${AGENT_PREFIX}/${params.agent_id}/logs`, params);

// 获取应用日志详情
export const getAgentLogApi = (agentId: string, logId: string) =>
  GET<AgentLog>(`${AGENT_PREFIX}/${agentId}/logs/${logId}`);

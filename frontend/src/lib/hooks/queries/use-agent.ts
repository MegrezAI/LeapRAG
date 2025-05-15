import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  type AgentCreateSchema,
  type AgentUpdateSchema,
  type SendMessageSchema
} from '@/lib/schema/agent';
import {
  getAgentsApi,
  createAgentApi,
  getAgentApi,
  updateAgentApi,
  deleteAgentApi,
  sendMessageApi,
  getAgentLogsApi,
  getAgentLogApi
} from '@/api/agent';
import { createQueryKeys } from '@/lib/utils/query';
import { useInvalidateQuery } from './use-base';
import { type Agent } from '@/types/agent';
import dayjs from 'dayjs';
import { type AgentLogListParams } from '@/types/agent-log';

const APP_QUERY_KEYS = createQueryKeys('agents');

export function useAgents() {
  return useQuery({
    queryKey: APP_QUERY_KEYS.list(),
    queryFn: getAgentsApi,
    select: (data) => {
      return [...data].sort(
        (a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf()
      );
    }
  });
}

export function useInvalidateAgents() {
  return useInvalidateQuery(APP_QUERY_KEYS.list());
}

export function useAgent(agentId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: APP_QUERY_KEYS.detail(agentId),
    queryFn: () => getAgentApi(agentId),
    enabled: options?.enabled ?? !!agentId
  });
}

export function useInvalidateAgent(agentId: string) {
  return useInvalidateQuery(APP_QUERY_KEYS.detail(agentId));
}

export function useCreateAgent({
  onSuccess,
  onError
}: {
  onSuccess?: (data: Agent) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: (data: AgentCreateSchema) => createAgentApi(data),
    onSuccess,
    onError
  });
}

export function useUpdateAgent({
  onSuccess,
  onError
}: {
  onSuccess?: (response: Agent, variables: { id: string; data: AgentUpdateSchema }) => void;
  onError?: (error: Error) => void;
}) {
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AgentUpdateSchema }) => updateAgentApi(id, data),
    onSuccess,
    onError
  });
}

export function useDeleteAgent({
  onSuccess,
  onError
}: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
} = {}) {
  return useMutation({
    mutationFn: (agentId: string) => deleteAgentApi(agentId),
    onSuccess,
    onError
  });
}

export function useSendMessage() {
  return useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: SendMessageSchema }) =>
      sendMessageApi(agentId, data)
  });
}

export const useSetAgentQueryData = () => {
  const queryClient = useQueryClient();

  return (id: string, updater: (oldData: Agent | undefined) => Agent) => {
    queryClient.setQueryData<Agent>(APP_QUERY_KEYS.detail(id), updater);
  };
};

export function useAgentLogs(params: AgentLogListParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...APP_QUERY_KEYS.detail(params.agent_id), 'logs', params],
    queryFn: () => getAgentLogsApi(params),
    enabled: options?.enabled ?? !!params.agent_id
  });
}

export function useAgentLog(agentId: string, logId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...APP_QUERY_KEYS.detail(agentId), 'logs', logId],
    queryFn: () => getAgentLogApi(agentId, logId),
    enabled: options?.enabled ?? !!(agentId && logId)
  });
}

export function useInvalidateAgentLogs(agentId: string) {
  return useInvalidateQuery([...APP_QUERY_KEYS.detail(agentId), 'logs']);
}

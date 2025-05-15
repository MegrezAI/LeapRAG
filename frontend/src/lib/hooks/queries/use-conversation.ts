import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConversationsApi,
  createConversationApi,
  deleteConversationsApi,
  getConversationApi,
  updateConversationApi,
  sendConversationMessageApi,
  sendQuestionApi,
  generateMindMapApi,
  generateRelatedTermsApi,
  textToSpeechApi,
  thumbUpMessageApi,
  deleteMessageApi
} from '@/api/conversation';
import type {
  Conversation,
  ConversationCreateParams,
  ConversationMessageParams,
  ConversationCompletionParams,
  QuestionParams,
  TTSParams,
  ThumbUpMessageParams,
  ThumbUpParams
} from '@/types/conversation';
import { createQueryKeys } from '@/lib/utils/query';
import { useInvalidateQuery } from './use-base';

const QUERY_KEYS = createQueryKeys('conversations');

// 获取对话列表
export function useConversations(dialog_id: string) {
  return useQuery({
    queryKey: [...QUERY_KEYS.list(), dialog_id],
    queryFn: () => getConversationsApi(dialog_id)
  });
}

// 获取对话详情
export function useConversation(conversation_id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEYS.detail(conversation_id),
    queryFn: () => getConversationApi(conversation_id),
    enabled: options?.enabled !== false && !!conversation_id
  });
}

export const useInvalidateConversations = (dialog_id: string) => {
  return useInvalidateQuery([...QUERY_KEYS.list(), dialog_id]);
};

export const useInvalidateConversation = (conversation_id: string) => {
  return useInvalidateQuery(QUERY_KEYS.detail(conversation_id));
};

// 创建新对话
export function useCreateConversation({
  onSuccess,
  onError
}: {
  onSuccess?: (conversation: Conversation) => void;
  onError?: (error: any) => void;
} = {}) {
  return useMutation({
    mutationFn: (params: ConversationCreateParams) => createConversationApi(params),
    onSuccess,
    onError
  });
}

// 删除对话
export function useDeleteConversations({
  onSuccess,
  onError
}: {
  onSuccess?: () => void;
  onError?: (error: any) => void;
} = {}) {
  return useMutation({
    mutationFn: (conversation_ids: string[]) => deleteConversationsApi(conversation_ids),
    onSuccess,
    onError
  });
}

// 更新对话信息
export function useUpdateConversation({
  onSuccess,
  onError
}: {
  onSuccess?: (conversation: Conversation) => void;
  onError?: (error: any) => void;
} = {}) {
  return useMutation({
    mutationFn: ({ id, ...params }: Partial<Conversation> & { id: string }) =>
      updateConversationApi(id, params),
    onSuccess,
    onError
  });
}

// 发送对话消息
export function useSendMessage({
  onSuccess,
  onError
}: {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
} = {}) {
  return useMutation({
    mutationFn: ({ conversation_id, ...params }: ConversationCompletionParams) =>
      sendConversationMessageApi(conversation_id, params),
    onSuccess,
    onError
  });
}

// 发送问题
export function useSendQuestion({
  onSuccess,
  onError
}: {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
} = {}) {
  return useMutation({
    mutationFn: (params: QuestionParams) => sendQuestionApi(params),
    onSuccess,
    onError
  });
}

// 生成思维导图
export function useGenerateMindMap({
  onSuccess,
  onError
}: {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
} = {}) {
  return useMutation({
    mutationFn: (params: QuestionParams) => generateMindMapApi(params),
    onSuccess,
    onError
  });
}

// 生成相关搜索词
export function useGenerateRelatedTerms({
  onSuccess,
  onError
}: {
  onSuccess?: (data: string[]) => void;
  onError?: (error: any) => void;
} = {}) {
  return useMutation({
    mutationFn: (params: QuestionParams) => generateRelatedTermsApi(params),
    onSuccess,
    onError
  });
}

// 文本转语音
export function useTextToSpeech({
  onSuccess,
  onError
}: {
  onSuccess?: (data: Blob) => void;
  onError?: (error: any) => void;
} = {}) {
  return useMutation({
    mutationFn: (params: TTSParams) => textToSpeechApi(params),
    onSuccess,
    onError
  });
}

// 点赞/反馈消息
export function useThumbUp({
  onSuccess,
  onError
}: {
  onSuccess?: (conversation: Conversation) => void;
  onError?: (error: any) => void;
} = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversation_id,
      message_id,
      ...params
    }: ThumbUpParams & { conversation_id: string }) =>
      thumbUpMessageApi(conversation_id, message_id, params),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.detail(variables.conversation_id)
      });
      onSuccess?.(data);
    },
    onError
  });
}

// 删除消息
export function useDeleteMessage({
  onSuccess,
  onError
}: {
  onSuccess?: (conversation: Conversation) => void;
  onError?: (error: any) => void;
} = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      conversation_id,
      message_id
    }: {
      conversation_id: string;
      message_id: string;
    }) => deleteMessageApi(conversation_id, message_id),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.detail(variables.conversation_id)
      });
      onSuccess?.(data);
    },
    onError
  });
}

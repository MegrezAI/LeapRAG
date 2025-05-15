import { GET, POST, PUT, DELETE } from '@/lib/utils/request';
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

export const CONVERSATION_PREFIX = '/rag/conversation';

// 获取对话列表
export const getConversationsApi = async (dialog_id: string) => {
  return GET<Conversation[]>(`${CONVERSATION_PREFIX}`, { dialog_id });
};

// 创建新对话
export const createConversationApi = async (params: ConversationCreateParams) => {
  return POST<Conversation>(`${CONVERSATION_PREFIX}`, params);
};

// 删除对话
export const deleteConversationsApi = async (conversation_ids: string[]) => {
  return DELETE<{ result: string }>(`${CONVERSATION_PREFIX}`, { conversation_ids });
};

// 获取对话详情
export const getConversationApi = async (conversation_id: string) => {
  return GET<Conversation>(`${CONVERSATION_PREFIX}/${conversation_id}`);
};

// 更新对话信息
export const updateConversationApi = async (
  conversation_id: string,
  params: Partial<Conversation>
) => {
  return PUT<Conversation>(`${CONVERSATION_PREFIX}/${conversation_id}`, params);
};

// 发送对话消息
export const sendConversationMessageApi = async (
  conversation_id: string,
  params: ConversationMessageParams
) => {
  return POST<any>(`${CONVERSATION_PREFIX}/${conversation_id}`, { ...params, conversation_id });
};

// 发送问题
export const sendQuestionApi = async (params: QuestionParams) => {
  return POST<any>(`${CONVERSATION_PREFIX}/question`, params);
};

// 生成思维导图
export const generateMindMapApi = async (params: QuestionParams) => {
  return PUT<any>(`${CONVERSATION_PREFIX}/question`, params);
};

// 生成相关搜索词
export const generateRelatedTermsApi = async (params: QuestionParams) => {
  return POST<string[]>(`${CONVERSATION_PREFIX}/question`, params);
};

// 文本转语音
export const textToSpeechApi = async (params: TTSParams) => {
  return POST<Blob>(`${CONVERSATION_PREFIX}/tts`, params, { responseType: 'blob' });
};

// 点赞/反馈消息
export const thumbUpMessageApi = async (
  conversation_id: string,
  message_id: string,
  params: ThumbUpMessageParams
) => {
  return POST<Conversation>(`${CONVERSATION_PREFIX}/${conversation_id}/${message_id}`, params);
};

// 删除消息
export const deleteMessageApi = async (conversation_id: string, message_id: string) => {
  return DELETE<Conversation>(`${CONVERSATION_PREFIX}/${conversation_id}/${message_id}`);
};

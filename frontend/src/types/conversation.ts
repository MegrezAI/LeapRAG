import { type MessageType } from '@/lib/constants/rag/chat';
import { z } from 'zod';

export interface Message {
  role: MessageType;
  content: string;
  id?: string;
  thumbup?: boolean;
  feedback?: string;
  prompt?: string;
}

export interface Reference {
  chunks: {
    id: string;
    content: string;
    document_id: string;
    document_name: string;
    dataset_id: string;
    image_id?: string;
    positions?: number[];
  }[];
  doc_aggs: any[];
}

export interface Conversation {
  id: string;
  dialog_id: string;
  name: string;
  messages: Message[];
  reference?: Reference[];
  avatar?: string;
  created_at?: string;
}

export interface ConversationCreateParams {
  name: string;
  dialog_id: string;
  messages: Message[];
}

export interface ConversationMessageParams {
  messages: Message[];
  stream?: boolean;
}

export interface ConversationCompletionParams extends ConversationMessageParams {
  conversation_id: string;
}

export interface QuestionParams {
  question: string;
  kb_ids: string[];
}

export interface TTSParams {
  text: string;
}

export interface ThumbUpMessageParams {
  set: boolean;
  feedback?: string;
}

export interface ThumbUpParams extends ThumbUpMessageParams {
  message_id: string;
}

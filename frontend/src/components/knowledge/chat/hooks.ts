import { useCallback, useEffect, useState } from 'react';
import {
  useConversation,
  useCreateConversation,
  useInvalidateConversation,
  useInvalidateConversations
} from '@/lib/hooks/queries/use-conversation';
import { useStreamMessage } from '@/lib/hooks/use-stream-message';
import { CONVERSATION_PREFIX } from '@/api/conversation';
import { useDialog } from '@/lib/hooks/queries/use-dialog';
import { MessageType } from '@/lib/constants/rag/chat';
import { v4 as uuid } from 'uuid';
import { type Message } from '@/types/conversation';
import { type SSEExtraInfo } from '@/lib/utils/request';

interface UseChatSession {
  messages: Message[];
  isResponding: boolean;
  extraInfo: SSEExtraInfo | null;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
}

export function useChatSession(dialogId: string): UseChatSession {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { data: dialogDetail } = useDialog(dialogId);
  const [messages, setMessages] = useState<Message[]>([]);
  const {
    content,
    extraInfo,
    isResponding,
    messageId,
    isDone,
    hasError,
    sendMessage: streamMessage,
    stopGeneration
  } = useStreamMessage();

  const { mutateAsync: createConversation } = useCreateConversation();
  const { data: conversation } = useConversation(conversationId || '', {
    enabled: !!conversationId && isDone
  });

  const createMessage = (content: string, role: MessageType) => ({
    id: uuid(),
    role,
    content,
    ...(role === MessageType.User ? { doc_ids: [] } : {})
  });

  const addQuestion = useCallback(
    (input: string) => {
      const userMessage = createMessage(input, MessageType.User);
      setMessages((prev) =>
        hasError && prev.length > 0 && prev[prev.length - 1].role === MessageType.User
          ? [...prev.slice(0, -1), userMessage]
          : [...prev, userMessage]
      );
    },
    [hasError]
  );

  const addOrUpdateAnswer = useCallback((content: string) => {
    const aiMessage = createMessage(content, MessageType.Assistant);
    setMessages((prev) => {
      const lastMessage = prev.at(-1);
      return lastMessage?.role === MessageType.Assistant
        ? [...prev.slice(0, -1), { ...lastMessage, content }]
        : [...prev, aiMessage];
    });
  }, []);

  useEffect(() => {
    const prologue = dialogDetail?.prompt_config?.prologue;
    if (!prologue) return;

    setMessages((prev) => {
      if (prev.length === 0) {
        return [
          {
            id: uuid(),
            role: MessageType.Assistant,
            content: prologue
          }
        ];
      }

      if (prev[0].role !== MessageType.Assistant) {
        return prev;
      }

      return [{ ...prev[0], content: prologue }, ...prev.slice(1)];
    });
  }, [dialogDetail?.prompt_config?.prologue]);

  useEffect(() => {
    if (content) {
      addOrUpdateAnswer(content);
    }
  }, [content, addOrUpdateAnswer]);

  useEffect(() => {
    if (conversation?.messages) {
      setMessages(
        conversation.messages.map((msg) => ({
          ...msg,
          id: msg.id ?? uuid()
        }))
      );
    }
  }, [conversation]);

  const sendMessage = async (input: string) => {
    if (!input || isResponding) return;

    const messagesToSend = hasError ? messages.slice(0, -1) : messages;
    addQuestion(input);

    try {
      const endpoint = `${CONVERSATION_PREFIX}/${
        conversationId ?? (await createInitialConversation(input)).id
      }`;

      await streamMessage(endpoint, {
        messages: [...messagesToSend, createMessage(input, MessageType.User)]
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const createInitialConversation = async (input: string) => {
    const conv = await createConversation({
      dialog_id: dialogId,
      name: input.slice(0, 50),
      messages: [createMessage(input, MessageType.Assistant)]
    });
    setConversationId(conv.id);
    return conv;
  };

  return {
    extraInfo,
    messages,
    isResponding,

    sendMessage,
    stopGeneration
  };
}

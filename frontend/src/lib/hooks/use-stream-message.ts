import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { sseRequest, type SSEExtraInfo } from '@/lib/utils/request';

interface StreamMessage {
  content: string;
  extraInfo: SSEExtraInfo | null;
  isResponding: boolean;
  isDone: boolean;
  messageId: string | null;
  sendMessage: (url: string, payload: any) => Promise<boolean>;
  stopGeneration: () => void;
  hasError: boolean;
}

export function useStreamMessage(): StreamMessage {
  const t = useTranslations();
  const [content, setContent] = useState<string>('');
  const [isResponding, setIsResponding] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [extraInfo, setExtraInfo] = useState<SSEExtraInfo | null>(null);
  const [messageId, setMessageId] = useState<string | null>(null);
  const abortController = useRef<AbortController>(null);
  const contentChunks = useRef<string[]>([]);
  const hasContent = useRef(false);
  const [hasError, setHasError] = useState(false);

  const reset = useCallback(() => {
    setContent('');
    setMessageId(null);
    setIsDone(false);
    setHasError(false);
    contentChunks.current = [];
    hasContent.current = false;
  }, []);

  const stopGeneration = useCallback(() => {
    abortController.current?.abort();
    setIsResponding(false);
  }, []);

  const sendMessage = useCallback(
    async (url: string, payload: any): Promise<boolean> => {
      if (isResponding) {
        toast.info(t('Please wait for the end of the previous response'));
        return false;
      }

      setIsResponding(true);
      setHasError(false);
      reset();

      try {
        await sseRequest(url, payload, {
          callbacks: {
            onData: (answer, moreInfo) => {
              setContent(answer);
              if (moreInfo) {
                setExtraInfo(moreInfo);
              }

              if (answer && !hasContent.current) {
                hasContent.current = true;
              }
            },
            onError: (error) => {
              console.error('Stream error:', error);
              if (typeof error === 'string') {
                toast.error(error);
              }
              setIsResponding(false);
              setIsDone(true);
              setHasError(true);
            },
            onCompleted: () => {
              // Delay waiting for backend to finish processing stream data
              setTimeout(() => {
                setIsResponding(false);
                setIsDone(true);
              }, 1000);
            },
            getAbortController: (controller) => {
              abortController.current = controller;
            }
          }
        });
        return true;
      } catch (e) {
        setIsResponding(false);
        console.error('Stream request failed:', e);
        return false;
      }
    },
    [isResponding, reset]
  );

  return {
    extraInfo,
    content,
    isResponding,
    isDone,
    messageId,
    sendMessage,
    stopGeneration,
    hasError
  };
}

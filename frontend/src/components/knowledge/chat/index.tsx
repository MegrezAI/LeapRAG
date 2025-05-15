'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChatMessageList } from '@/components/ui/chat/chat-message-list';
import { ChatInput } from '@/components/ui/chat/chat-input';
import { ChatBubble, ChatBubbleMessage } from '@/components/ui/chat/chat-bubble';
import {
  Dialog as UIDialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Mic, NotepadTextIcon, Paperclip, Send, Settings2 } from 'lucide-react';
import PageHeader from '@/components/base/page-header';
import { useTranslations } from 'next-intl';
import { DialogForm } from './dialog-form';
import { useChatSession } from './hooks';
import { MessageType } from '@/lib/constants/rag/chat';
import MarkdownContent from '@/components/markdown/markdown-content';
import { useKnowledgeBase } from '@/lib/hooks/queries/use-knowledge';
import PromptLogModal from './prompt-log-modal';
import { type Message } from '@/types/conversation';

interface ChatSessionProps {
  kbId: string;
}

export default function KnowledgeBaseChat({ kbId }: ChatSessionProps) {
  const [input, setInput] = useState('');
  const [isPromptLogOpen, setIsPromptLogOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<string>('');
  const { data: kb, isLoading } = useKnowledgeBase(kbId);
  const dialog = kb?.dialogs[0];
  const t = useTranslations();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { messages, isResponding, extraInfo, sendMessage, stopGeneration } = useChatSession(
    dialog?.id || ''
  );
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
  };

  const ChatAiIcons = [
    {
      icon: NotepadTextIcon,
      label: t('Prompt Log'),
      enabled: (message: Message) => !!message.prompt,
      onClick: (message: Message) => {
        setCurrentPrompt(message.prompt || '');
        setIsPromptLogOpen(true);
      }
    }
  ];

  const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input || isResponding) return;
    const messageToSend = input;
    setInput('');
    await sendMessage(messageToSend);
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      handleSendMessage(e as unknown as React.FormEvent<HTMLFormElement>);
    }
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messagesEndRef]);

  useEffect(() => {
    if (messages.length > 0 || isResponding) {
      scrollToBottom();
    }
  }, [messages, isResponding, scrollToBottom]);

  if (!dialog) return null;

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={t('Chatbot')}>
        <UIDialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="size-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80dvh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('Edit Chatbot')}</DialogTitle>
            </DialogHeader>
            <DialogForm dialogData={dialog} />
          </DialogContent>
        </UIDialog>
      </PageHeader>

      <div className="flex-1 flex flex-col h-full">
        <div className="flex-1 w-full overflow-y-auto bg-muted/40">
          <ChatMessageList ref={messagesContainerRef}>
            {messages.map((message) => (
              <div key={message.id} className="flex flex-col gap-2 p-4">
                <ChatBubble variant={message.role === MessageType.Assistant ? 'received' : 'sent'}>
                  <div className="flex items-start gap-2">
                    {message.role === MessageType.Assistant ? (
                      <>
                        <div className="flex-shrink-0">
                          <Avatar>
                            <AvatarImage src="" alt="Avatar" className="dark:invert" />
                            <AvatarFallback>🤖</AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="text-sm text-muted-foreground">{t('AI Assistant')}</div>
                          <ChatBubbleMessage>
                            <MarkdownContent
                              reference={extraInfo?.reference}
                              content={message.content}
                            />
                          </ChatBubbleMessage>
                          <div className="flex items-center mt-1.5 gap-1">
                            {ChatAiIcons.filter((icon) => icon.enabled(message)).map((icon, i) => {
                              const Icon = icon.icon;
                              return (
                                <Button
                                  key={i}
                                  variant="ghost"
                                  size="icon"
                                  className="size-6"
                                  onClick={() => icon.onClick(message)}
                                >
                                  <Icon className="size-3" />
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex flex-col gap-2 flex-1">
                          <div className="text-sm text-muted-foreground text-end">{t('User')}</div>
                          <ChatBubbleMessage>
                            <MarkdownContent content={message.content} />
                          </ChatBubbleMessage>
                        </div>
                        <div className="flex-shrink-0">
                          <Avatar>
                            <AvatarFallback>U</AvatarFallback>
                          </Avatar>
                        </div>
                      </>
                    )}
                  </div>
                </ChatBubble>
              </div>
            ))}
            {isResponding &&
              messages.length > 0 &&
              messages[messages.length - 1].role !== MessageType.Assistant && (
                <div className="flex flex-col gap-2 p-4">
                  <ChatBubble variant="received">
                    <Avatar>
                      <AvatarImage src="" alt="Avatar" className="dark:invert" />
                      <AvatarFallback>🤖</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col gap-2">
                      <div className="text-sm text-muted-foreground">{t('AI Assistant')}</div>
                      <ChatBubbleMessage isLoading />
                    </div>
                  </ChatBubble>
                </div>
              )}

            <div className="h-0 w-full flex-shrink-0" ref={messagesEndRef} />
          </ChatMessageList>
        </div>
        <div className="px-4 pb-4 bg-[#F9FBFD] dark:bg-muted/40 sticky bottom-0 left-0 right-0">
          <form
            onSubmit={handleSendMessage}
            className="relative rounded-lg border bg-background focus-within:ring-1 focus-within:ring-ring"
          >
            <ChatInput
              ref={inputRef}
              value={input}
              onKeyDown={handleKeyDown}
              onChange={handleInputChange}
              className="min-h-12 resize-none rounded-lg bg-background border-0 p-3 shadow-none focus-visible:ring-0"
            />
            <div className="flex items-center p-3 pt-0">
              <Button
                disabled={!input || isResponding}
                type="submit"
                size="sm"
                className="ml-auto gap-1.5"
              >
                <Send className="size-4" />
              </Button>
            </div>
          </form>
        </div>
      </div>
      <PromptLogModal
        isOpen={isPromptLogOpen}
        onClose={() => setIsPromptLogOpen(false)}
        prompt={currentPrompt}
      />
    </div>
  );
}

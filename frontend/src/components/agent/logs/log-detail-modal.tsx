'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { type AgentLog } from '@/types/agent-log';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { getStateVariant } from '@/lib/utils/agent-log';

interface LogDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AgentLog | null;
}

export function LogDetailModal({ isOpen, onClose, log }: LogDetailModalProps) {
  const t = useTranslations();

  if (!log) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{t('Log Details')}</span>
            <Badge variant={getStateVariant(log.state)}>{log.state}</Badge>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[calc(80vh-100px)]">
          <div className="space-y-8 pr-4">
            {log.history.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-lg font-semibold">{t('Message History')}</h3>
                <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                  {JSON.stringify(log.history, null, 2)}
                </pre>
              </section>
            )}

            <section className="space-y-4">
              <h3 className="text-lg font-semibold">{t('Task Metadata')}</h3>
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md">
                {JSON.stringify(log.task_metadata, null, 2)}
              </pre>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

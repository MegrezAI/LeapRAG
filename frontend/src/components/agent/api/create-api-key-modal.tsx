'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Plus, Copy } from 'lucide-react';
import {
  useCreateApiKey,
  useInvalidateApiKeys,
  useInvalidateApiKeysByAgentId
} from '@/lib/hooks/queries/use-current-accout';
import { toast } from 'sonner';
import copy from 'copy-to-clipboard';

interface CreateApiKeyModalProps {
  agentId: string;
  hasApiKeys: boolean;
}

interface ApiKeyResponse {
  apikey: string;
}

export function CreateApiKeyModal({ agentId, hasApiKeys }: CreateApiKeyModalProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const invalidateApiKeysByAgentId = useInvalidateApiKeysByAgentId(agentId);

  const { mutate: createApiKey, isPending: isCreating } = useCreateApiKey({
    onSuccess: (data: ApiKeyResponse) => {
      invalidateApiKeysByAgentId();
      setNewApiKey(data.apikey);
      setOpen(true);
      toast.success(t('Created Successfully'));
    },
    onError: () => {
      toast.error(t('Create Failed'));
    }
  });

  const handleCreateApiKey = () => {
    if (hasApiKeys) {
      toast.warning(t('You can only create one API key'));
      return;
    }

    createApiKey({
      source: 'web',
      agent_id: agentId
    });
  };

  const handleCopyApiKey = () => {
    if (newApiKey) {
      copy(newApiKey);
      toast.success(t('Copied to clipboard successfully'));
    }
  };

  return (
    <>
      <Button size="sm" onClick={handleCreateApiKey} disabled={isCreating}>
        <Plus className="size-4" />
        <span>{t('Create API Key')}</span>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('API Key')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              {t('To prevent API misuse, please protect your API key')}
            </p>
            {newApiKey && (
              <div className="bg-muted p-3 rounded-md mb-4 font-mono text-sm break-all">
                {newApiKey}
              </div>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" size="icon" onClick={handleCopyApiKey}>
                <Copy className="size-4" />
              </Button>
              <Button onClick={() => setOpen(false)}>{t('Close')}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

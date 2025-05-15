import { ModelProviderIcon } from '@/components/icon/model-provider-icon';
import { Badge } from '@/components/ui/badge';
import { type LLMProvider } from '@/lib/constants/rag/llm';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronRight, Trash, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { ConfirmModal } from '@/components/base/confirm-modal';
import { useDeleteLLM, useInvalidateLLMs } from '@/lib/hooks/queries/use-llm';

interface AddedModelProviderCardProps {
  name: LLMProvider;
  tags: string;
  models: Array<{
    type: string;
    name: string;
    used_token: number;
  }>;
}

export function AddedModelProviderCard({ name, tags, models }: AddedModelProviderCardProps) {
  const tagsArray = tags.split(',');
  const t = useTranslations();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [modelToDelete, setModelToDelete] = useState<string | null>(null);

  const { mutateAsync: deleteModelProvider } = useDeleteLLM();
  const invalidateLLMs = useInvalidateLLMs();

  const handleConfirmDelete = async (modelName: string) => {
    await deleteModelProvider({ llm_factory: name, llm_name: modelName });
    invalidateLLMs();
    setShowConfirmModal(false);
  };

  return (
    <div className="p-4 rounded-lg border border-border w-full">
      <div className="flex gap-4 items-center">
        <div className="flex-shrink-0">
          <ModelProviderIcon size={48} provider={name} />
        </div>
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <h3 className="font-bold">{name}</h3>
          </div>
          <div className="space-y-1">
            {tagsArray.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="text-[10px] font-light px-1 py-0 text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      <Collapsible className="mt-3">
        <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground group">
          <ChevronRight className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-90" />
          {t('Model length', { item: models.length })}
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-1 mt-1">
          {models.map((model) => (
            <div
              key={model.name}
              className="text-sm flex items-center hover:bg-muted rounded-md p-1 gap-1"
            >
              <ModelProviderIcon provider={name} />
              <span className="mr-1">{model.name}</span>
              <Badge
                variant="outline"
                className="text-[10px] px-1 py-0 font-light text-muted-foreground"
              >
                {model.type}
              </Badge>
              <Button
                variant="clear"
                className="p-1 size-4 text-destructive ml-2"
                onClick={() => {
                  setModelToDelete(model.name);
                  setShowConfirmModal(true);
                }}
              >
                <XCircle className="size-4" />
              </Button>
            </div>
          ))}
        </CollapsibleContent>
      </Collapsible>
      {showConfirmModal && modelToDelete && (
        <ConfirmModal
          isShow={showConfirmModal}
          onConfirm={() => handleConfirmDelete(modelToDelete)}
          onCancel={() => setShowConfirmModal(false)}
          type="destructive"
        />
      )}
    </div>
  );
}

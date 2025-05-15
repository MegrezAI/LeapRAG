'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { type DialogParamsSchema, dialogParamsSchema } from '@/lib/schema/dialog';
import { toast } from 'sonner';
import {
  useCreateDialog,
  useUpdateDialog,
  useInvalidateDialogs,
  useInvalidateDialog
} from '@/lib/hooks/queries/use-dialog';
import { useKnowledgeBases } from '@/lib/hooks/queries/use-knowledge';
import { Save, Bot, Settings, Sparkles } from 'lucide-react';
import { BasicSettings } from './settings/basic-settings';
import { PromptSettings } from './settings/prompt-settings';
import { ModelSettings } from './settings/model-settings';
import { useInvalidateLLMMap } from '@/lib/hooks/queries/use-llm';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { type LucideIcon } from 'lucide-react';

interface DialogFormProps {
  dialogData?: DialogParamsSchema;
  onSuccess?: () => void;
}

interface SectionConfig {
  label: string;
  icon: LucideIcon;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
}

export function DialogForm({ dialogData, onSuccess }: DialogFormProps) {
  const t = useTranslations();
  const invalidateDialog = useInvalidateDialog(dialogData?.id || '');
  const invalidateLLMMap = useInvalidateLLMMap();
  const { data: knowledgeBases, isLoading: isLoadingKbs } = useKnowledgeBases({});

  const prologue = t('Assistant Prologue');
  const systemPrompt = t.raw('Assistant System Prompt');

  const { mutate: createDialog, isPending: isCreating } = useCreateDialog({
    onSuccess: () => {
      toast.success(t('Created Successfully'));
      onSuccess?.();
    },
    onError: () => {
      toast.error(t('Operation Failed'));
    }
  });

  const { mutate: updateDialog, isPending: isUpdating } = useUpdateDialog({
    onSuccess: () => {
      toast.success(t('Updated Successfully'));
      invalidateDialog();
      invalidateLLMMap();
      onSuccess?.();
    },
    onError: () => {
      toast.error(t('Operation Failed'));
    }
  });

  const form = useForm<DialogParamsSchema>({
    resolver: zodResolver(dialogParamsSchema),
    defaultValues: {
      name: '',
      description: '',
      kb_ids: [],
      top_n: 6,
      similarity_threshold: 0.1,
      vector_similarity_weight: 0.3,
      prompt_config: {
        empty_response: '',
        prologue: prologue,
        quote: true,
        keyword: false,
        tts: false,
        system: systemPrompt,
        refine_multiturn: true,
        use_kg: false,
        parameters: []
      },
      llm_setting: {
        temperature: 0.7,
        top_p: 1,
        presence_penalty: 0,
        frequency_penalty: 0,
        max_tokens: 2000
      },
      llm_id: '',
      language: 'English'
    }
  });

  useEffect(() => {
    if (dialogData) {
      form.reset(dialogData);
    }
  }, [dialogData]);

  const onSubmit = (data: DialogParamsSchema) => {
    if (dialogData?.id) {
      updateDialog({ ...data, id: dialogData.id });
    } else {
      createDialog(data);
    }
  };

  const isPending = isCreating || isUpdating;
  const kbList = knowledgeBases?.data || [];

  const sectionConfigs: SectionConfig[] = [
    {
      label: t('Basic Settings'),
      icon: Settings,
      component: BasicSettings,
      props: { isPending, knowledgeBases: kbList }
    },
    {
      label: t('Prompt Settings'),
      icon: Sparkles,
      component: PromptSettings
    },
    {
      label: t('Model Settings'),
      icon: Bot,
      component: ModelSettings,
      props: { isPending }
    }
  ];

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-6">
          {sectionConfigs.map((section) => (
            <div key={section.label} className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b">
                <section.icon className="size-4" />
                <h3 className="text-sm font-medium">{section.label}</h3>
              </div>
              <section.component {...section.props} />
            </div>
          ))}
        </div>

        <div className="pt-6 border-t flex justify-end">
          <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
            <Save className="size-4 mr-2" />
            {dialogData ? t('Update') : t('Create')}
          </Button>
        </div>
      </form>
    </FormProvider>
  );
}

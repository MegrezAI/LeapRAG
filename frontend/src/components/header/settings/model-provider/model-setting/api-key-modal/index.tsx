'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import { updateLLMFactoryApiKeyApi } from '@/api/rag/llm';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { LLMProvider } from '@/lib/constants/rag/llm';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { z } from 'zod';
import { useInvalidateLLMs } from '@/lib/hooks/queries/use-llm';

interface ModelApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  llmFactory: LLMProvider;
}
const modelsWithBaseUrl = [LLMProvider.OPENAI, LLMProvider.AZURE_OPENAI];

const formSchema = z.object({
  api_key: z.string().min(1),
  base_url: z.string().optional()
});

type FormValues = z.infer<typeof formSchema>;

export function ModelApiKeyModal({ open, onOpenChange, llmFactory }: ModelApiKeyModalProps) {
  const t = useTranslations();
  const invalidateLLMs = useInvalidateLLMs();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      api_key: '',
      base_url: ''
    }
  });

  const { mutate: updateApiKey, isPending } = useMutation({
    mutationFn: updateLLMFactoryApiKeyApi,
    onSuccess: () => {
      toast.success(t('Updated Successfully'));
      onOpenChange(false);
      form.reset();
      invalidateLLMs();
    },
    onError: () => {}
  });

  const onSubmit = (values: FormValues) => {
    const payload = {
      llm_factory: llmFactory,
      api_key: values.api_key,
      base_url: modelsWithBaseUrl.includes(llmFactory) ? values.base_url : undefined
    };
    updateApiKey(payload);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{llmFactory}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="api_key"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>API Key</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {modelsWithBaseUrl.includes(llmFactory) && (
              <FormField
                control={form.control}
                name="base_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base URL</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://api.openai.com/v1" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button type="submit" className="w-full" disabled={isPending}>
              {t('Save')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

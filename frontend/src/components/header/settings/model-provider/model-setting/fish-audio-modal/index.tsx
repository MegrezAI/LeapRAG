'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { addLLMApi } from '@/api/rag/llm';
import { type LLMProvider, LLMTypeEnum } from '@/lib/constants/rag/llm';
import { useInvalidateLLMs } from '@/lib/hooks/queries/use-llm';
import Link from 'next/link';
import { SquareArrowOutUpRightIcon } from 'lucide-react';

interface FishAudioModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  llmFactory: LLMProvider;
  modelTypes: string[];
}

const formSchema = z.object({
  model_type: z.nativeEnum(LLMTypeEnum),
  llm_name: z.string().min(1),
  fish_audio_ak: z.string().min(1),
  fish_audio_refid: z.string().min(1),
  max_tokens: z.coerce.number().min(0).max(100000)
});

type FormValues = z.infer<typeof formSchema>;

export function FishAudioModal({
  open,
  onOpenChange,
  llmFactory,
  modelTypes
}: FishAudioModalProps) {
  const t = useTranslations();
  const invalidateLLMs = useInvalidateLLMs();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model_type: LLMTypeEnum.TTS,
      llm_name: '',
      fish_audio_ak: '',
      fish_audio_refid: '',
      max_tokens: 2048
    }
  });

  const { mutate: addFishAudioLlm, isPending } = useMutation({
    mutationFn: addLLMApi,
    onSuccess: () => {
      toast.success(t('Added Successfully'));
      onOpenChange(false);
      form.reset();
      invalidateLLMs();
    },
    onError: () => {
      toast.error(t('Add Failed'));
    }
  });

  const onSubmit = async (values: FormValues) => {
    const payload = {
      ...values,
      llm_factory: llmFactory
    };
    addFishAudioLlm(payload);
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
              name="model_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Model Type')}</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="tts">tts</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="llm_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Model Name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fish_audio_ak"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fish Audio Access Key</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="fish_audio_refid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fish Audio Ref ID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="max_tokens"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Max Tokens')}</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} min={0} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-between items-center pt-2">
              <Button variant="link" asChild className="p-0">
                <Link href="https://fish.audio" target="_blank" rel="noreferrer">
                  <p className="text-xs">Fish Audio</p>
                  <SquareArrowOutUpRightIcon className="size-4" />
                </Link>
              </Button>
              <Button type="submit" disabled={isPending}>
                {t('Save')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

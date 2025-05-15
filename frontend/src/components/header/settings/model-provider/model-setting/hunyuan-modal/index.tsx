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
import { Switch } from '@/components/ui/switch';
import { addLLMApi } from '@/api/rag/llm';
import { type LLMProvider, LLMTypeEnum } from '@/lib/constants/rag/llm';
import { useInvalidateLLMs } from '@/lib/hooks/queries/use-llm';

interface HunyuanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  llmFactory: LLMProvider;
  modelTypes: string[];
}

const formSchema = z.object({
  model_type: z.nativeEnum(LLMTypeEnum),
  llm_name: z.string().min(1),
  hunyuan_sid: z.string().min(1),
  hunyuan_sk: z.string().min(1),
  vision: z.boolean().optional(),
  max_tokens: z.coerce.number().min(0).max(100000)
});

type FormValues = z.infer<typeof formSchema>;

export function HunyuanModal({ open, onOpenChange, llmFactory, modelTypes }: HunyuanModalProps) {
  const t = useTranslations();
  const invalidateLLMs = useInvalidateLLMs();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model_type: LLMTypeEnum.CHAT,
      llm_name: '',
      hunyuan_sid: '',
      hunyuan_sk: '',
      vision: false,
      max_tokens: 2048
    }
  });

  const { mutate: addHunyuanLlm, isPending } = useMutation({
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
    const modelType =
      values.model_type === LLMTypeEnum.CHAT && values.vision
        ? LLMTypeEnum.IMAGE2TEXT
        : values.model_type;

    const payload = {
      ...values,
      model_type: modelType,
      llm_factory: llmFactory
    };
    delete payload.vision;
    addHunyuanLlm(payload);
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
                      <SelectItem value="chat">chat</SelectItem>
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
              name="hunyuan_sid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hunyuan SID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="hunyuan_sk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hunyuan SK</FormLabel>
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
            <FormField
              control={form.control}
              name="vision"
              render={({ field }) => (
                <FormItem className="flex items-center space-y-0 gap-2">
                  <FormLabel>{t('Vision')}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={isPending}>
              {t('Save')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

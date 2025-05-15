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

interface SparkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  llmFactory: LLMProvider;
  modelTypes: string[];
}

const formSchema = z.object({
  model_type: z.nativeEnum(LLMTypeEnum),
  llm_name: z.string().min(1),
  spark_api_password: z.string().optional(),
  spark_app_id: z.string().optional(),
  spark_api_secret: z.string().optional(),
  spark_api_key: z.string().optional(),
  vision: z.boolean().optional(),
  max_tokens: z.coerce.number().min(0).max(100000)
});

type FormValues = z.infer<typeof formSchema>;

export function SparkModal({ open, onOpenChange, llmFactory, modelTypes }: SparkModalProps) {
  const t = useTranslations();
  const invalidateLLMs = useInvalidateLLMs();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model_type: LLMTypeEnum.CHAT,
      llm_name: '',
      spark_api_password: '',
      spark_app_id: '',
      spark_api_secret: '',
      spark_api_key: '',
      vision: false,
      max_tokens: 2048
    }
  });

  const { mutate: addSparkLlm, isPending } = useMutation({
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

  const modelType = form.watch('model_type');

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
    addSparkLlm(payload);
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
            {modelType === LLMTypeEnum.CHAT && (
              <FormField
                control={form.control}
                name="spark_api_password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Spark API Password</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {modelType === LLMTypeEnum.TTS && (
              <>
                <FormField
                  control={form.control}
                  name="spark_app_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spark APP ID</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="spark_api_secret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spark API Secret</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="spark_api_key"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Spark API Key</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
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
            {modelType === LLMTypeEnum.CHAT && (
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

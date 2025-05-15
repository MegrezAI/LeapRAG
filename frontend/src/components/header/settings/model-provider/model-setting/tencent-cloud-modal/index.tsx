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

interface TencentCloudModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  llmFactory: LLMProvider;
  modelTypes: string[];
}

const formSchema = z.object({
  model_type: z.nativeEnum(LLMTypeEnum),
  llm_name: z.string().min(1),
  TencentCloud_sid: z.string().min(1),
  TencentCloud_sk: z.string().min(1),
  max_tokens: z.coerce.number().min(0).max(100000)
});

type FormValues = z.infer<typeof formSchema>;

const modelNameOptions = [
  '16k_zh',
  '16k_zh_large',
  '16k_multi_lang',
  '16k_zh_dialect',
  '16k_en',
  '16k_yue',
  '16k_zh-PY',
  '16k_ja',
  '16k_ko',
  '16k_vi',
  '16k_ms',
  '16k_id',
  '16k_fil',
  '16k_th',
  '16k_pt',
  '16k_tr',
  '16k_ar',
  '16k_es',
  '16k_hi',
  '16k_fr',
  '16k_zh_medical',
  '16k_de'
];

export function TencentCloudModal({
  open,
  onOpenChange,
  llmFactory,
  modelTypes
}: TencentCloudModalProps) {
  const t = useTranslations();
  const invalidateLLMs = useInvalidateLLMs();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model_type: LLMTypeEnum.SPEECH2TEXT,
      llm_name: '16k_zh',
      TencentCloud_sid: '',
      TencentCloud_sk: '',
      max_tokens: 16000
    }
  });

  const { mutate: addTencentCloudLlm, isPending } = useMutation({
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
    addTencentCloudLlm(payload);
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
                      <SelectItem value="speech2text">speech2text</SelectItem>
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {modelNameOptions.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="TencentCloud_sid"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tencent Cloud SID</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="TencentCloud_sk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tencent Cloud SK</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-between items-center pt-2">
              <Button variant="link" asChild className="p-0">
                <Link
                  href="https://cloud.tencent.com/document/api/1093/37823"
                  target="_blank"
                  rel="noreferrer"
                >
                  <p className="text-xs">Tencent Cloud API Documentation</p>
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

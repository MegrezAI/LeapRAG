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
import { SquareArrowOutUpRight, SquareArrowOutUpRightIcon } from 'lucide-react';
import Link from 'next/link';

interface BedrockModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  llmFactory: LLMProvider;
  modelTypes: string[];
}

const formSchema = z.object({
  model_type: z.nativeEnum(LLMTypeEnum),
  llm_name: z.string().min(1),
  bedrock_ak: z.string().min(1),
  bedrock_sk: z.string().min(1),
  bedrock_region: z.string().min(1),
  max_tokens: z.coerce.number().min(0).max(100000)
});

type FormValues = z.infer<typeof formSchema>;

const BedrockRegionList = [
  'us-east-1',
  'us-west-2',
  'ap-southeast-1',
  'ap-northeast-1',
  'eu-central-1'
];

export function BedrockModal({ open, onOpenChange, llmFactory, modelTypes }: BedrockModalProps) {
  const t = useTranslations();
  const invalidateLLMs = useInvalidateLLMs();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      model_type: LLMTypeEnum.CHAT,
      llm_name: '',
      bedrock_ak: '',
      bedrock_sk: '',
      bedrock_region: '',
      max_tokens: 2048
    }
  });

  const { mutate: addBedrockLlm, isPending } = useMutation({
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
    addBedrockLlm(payload);
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
                        <SelectValue placeholder={t('Select model type')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {modelTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
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
              name="bedrock_ak"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bedrock Access Key</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bedrock_sk"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bedrock Secret Key</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="bedrock_region"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bedrock Region</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('Select Bedrock region')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BedrockRegionList.map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
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
                <Link href="https://console.aws.amazon.com/" target="_blank" rel="noreferrer">
                  <p className="text-xs">
                    Get your Access Key and Secret Access Key from AWS Console
                  </p>
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

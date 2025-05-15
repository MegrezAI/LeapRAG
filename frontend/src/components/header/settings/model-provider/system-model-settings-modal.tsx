'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { type z } from 'zod';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@/components/ui/select';
import { getLLMFactoriesApi, getLLMsMapApi } from '@/api/rag/llm';
import useUserStore from '@/store/account';
import { useEffect } from 'react';
import { ModelProviderIcon } from '@/components/icon/model-provider-icon';
import { type LLMMap } from '@/types/rag/llm';
import { LLMTypeEnum, type LLMProvider } from '@/lib/constants/rag/llm';
import { getLLMIconName } from '@/lib/utils/llm';
import { type TenantInfoParams, tenantInfoSchema } from '@/lib/schema/account/tenant';
import { updateTenantInfoApi } from '@/api/account';
import { useLLMMap } from '@/lib/hooks/queries/use-llm';
import { useInvalidateCurrentAccount } from '@/lib/hooks/queries/use-current-accout';

interface SystemModelSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ModelGroup = {
  label: string;
  options: {
    label: React.ReactNode;
    value: string;
  }[];
};

const filterModelsByType = (llmInfo: LLMMap, type: LLMTypeEnum): ModelGroup[] => {
  if (!llmInfo) return [];

  return Object.entries(llmInfo)
    .filter(([, models]) => models.some((model) => model.model_type === type))
    .map(([provider, models]) => ({
      label: provider,
      options: models
        .filter((model) => model.model_type === type && model.available)
        .map((model) => ({
          label: (
            <div className="flex items-center gap-2">
              <ModelProviderIcon
                provider={getLLMIconName(model.fid, model.llm_name) as LLMProvider}
                size={26}
              />
              <span>{model.llm_name}</span>
            </div>
          ),
          value: `${model.llm_name}@${model.fid}`
        }))
    }))
    .filter((group) => group.options.length > 0);
};

const getModelDisplayValue = (value: string, models: ModelGroup[]) => {
  if (!value) return null;
  for (const group of models) {
    const option = group.options.find((opt) => opt.value === value);
    if (option) {
      return option.label;
    }
  }
  return value;
};

export function SystemModelSettingsModal({ open, onOpenChange }: SystemModelSettingsModalProps) {
  const t = useTranslations();
  const userInfo = useUserStore((state) => state.userInfo);
  const invalidateCurrentAccount = useInvalidateCurrentAccount();
  const { data: llmInfo } = useLLMMap({ enabled: open });

  const { mutate: updateTenantInfo, isPending: isUpdateTenantInfoPending } = useMutation({
    mutationFn: updateTenantInfoApi,
    onSuccess: () => {
      toast.success(t('Updated Successfully'));
      onOpenChange(false);
      invalidateCurrentAccount();
      form.reset();
    },
    onError: () => {
      toast.error(t('Update Failed'));
    }
  });

  const { tenant_info } = userInfo || {};

  const form = useForm<TenantInfoParams>({
    resolver: zodResolver(tenantInfoSchema),
    defaultValues: {
      name: '',
      llm_id: '',
      embd_id: '',
      img2txt_id: '',
      asr_id: '',
      rerank_id: '',
      tts_id: ''
    }
  });

  useEffect(() => {
    if (tenant_info) {
      form.reset(tenant_info);
    }
  }, [tenant_info, form]);
  const onSubmit = (values: TenantInfoParams) => {
    updateTenantInfo(values);
  };

  let llmModels: ModelGroup[] = [];
  let embdModels: ModelGroup[] = [];
  let img2txtModels: ModelGroup[] = [];
  let asrModels: ModelGroup[] = [];
  let rerankModels: ModelGroup[] = [];
  let ttsModels: ModelGroup[] = [];

  if (llmInfo) {
    llmModels = filterModelsByType(llmInfo, LLMTypeEnum.CHAT);
    embdModels = filterModelsByType(llmInfo, LLMTypeEnum.EMBEDDING);
    img2txtModels = filterModelsByType(llmInfo, LLMTypeEnum.IMAGE2TEXT);
    asrModels = filterModelsByType(llmInfo, LLMTypeEnum.SPEECH2TEXT);
    rerankModels = filterModelsByType(llmInfo, LLMTypeEnum.RERANK);
    ttsModels = filterModelsByType(llmInfo, LLMTypeEnum.TTS);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('System Model Settings')}</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="llm_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Chat Model')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {getModelDisplayValue(field.value, llmModels) || field.value}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {llmModels.map((group) => (
                        <SelectGroup key={`${group.label}`}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="embd_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Embedding Model')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>{field.value}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {embdModels.map((group) => (
                        <SelectGroup key={`${group.label}`}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="img2txt_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{'Img2txt ' + t('Model')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>{field.value}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {img2txtModels.map((group) => (
                        <SelectGroup key={`${group.label}`}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="asr_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{'Sequence2txt ' + t('Model')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>{field.value}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {asrModels.map((group) => (
                        <SelectGroup key={`${group.label}`}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rerank_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{'Rerank ' + t('Model')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>{field.value}</SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {rerankModels.map((group) => (
                        <SelectGroup key={`${group.label}`}>
                          <SelectLabel>{group.label}</SelectLabel>
                          {group.options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isUpdateTenantInfoPending}>
              {t('Save')}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

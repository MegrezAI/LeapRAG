'use client';

import { useFormContext } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel
} from '@/components/ui/select';
import { useLLMMap } from '@/lib/hooks/queries/use-llm';
import { LLMTypeEnum, type LLMProvider } from '@/lib/constants/rag/llm';
import { ModelProviderIcon } from '@/components/icon/model-provider-icon';
import { getLLMIconName } from '@/lib/utils/llm';
import { type LLMMap } from '@/types/rag/llm';
import { useTranslations } from 'next-intl';
import { type AgentConfigFormValues } from '..';

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

interface ModelSettingsProps {
  isPending?: boolean;
}

export function ModelSettings({ isPending = false }: ModelSettingsProps) {
  const { control } = useFormContext<AgentConfigFormValues>();
  const { data: llmInfo } = useLLMMap();
  const t = useTranslations();

  const llmModels = llmInfo ? filterModelsByType(llmInfo, LLMTypeEnum.CHAT) : [];

  return (
    <div className="space-y-6 px-1">
      <FormField
        control={control}
        name="agent_config.dialog_config.llm_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Language Model')}</FormLabel>
            <Select
              disabled={isPending}
              onValueChange={(value) => {
                if (!value) return;
                field.onChange(value);
              }}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue>
                    {getModelDisplayValue(field.value!, llmModels) || field.value}
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
      <div className="grid sm:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="agent_config.dialog_config.llm_setting.temperature"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('Temperature')}: {field.value}
              </FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={2}
                  step={0.1}
                  value={[field.value]}
                  onValueChange={([value]) => field.onChange(value)}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>{t('Temperature Description')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="agent_config.dialog_config.llm_setting.top_p"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Top P: {field.value}</FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[field.value]}
                  onValueChange={([value]) => field.onChange(value)}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>{t('Top P Description')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="agent_config.dialog_config.llm_setting.presence_penalty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('Presence Penalty')}: {field.value}
              </FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[field.value]}
                  onValueChange={([value]) => field.onChange(value)}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>{t('Presence Penalty Description')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="agent_config.dialog_config.llm_setting.frequency_penalty"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('Frequency Penalty')}: {field.value}
              </FormLabel>
              <FormControl>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={[field.value]}
                  onValueChange={([value]) => field.onChange(value)}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>{t('Frequency Penalty Description')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="agent_config.dialog_config.llm_setting.max_tokens"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t('Max Tokens')}: {field.value}
              </FormLabel>
              <FormControl>
                <Slider
                  min={1}
                  max={30000}
                  step={1}
                  value={[field.value]}
                  onValueChange={([value]) => field.onChange(value)}
                  disabled={isPending}
                />
              </FormControl>
              <FormDescription>{t('Max Tokens Description')}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}

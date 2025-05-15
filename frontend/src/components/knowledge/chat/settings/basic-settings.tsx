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
import { type DialogParamsSchema } from '@/lib/schema/dialog';
import { type KnowledgeBase } from '@/types/rag/knowledge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useTranslations } from 'next-intl';

interface BasicSettingsProps {
  isPending: boolean;
  knowledgeBases: KnowledgeBase[];
}

export function BasicSettings({ isPending, knowledgeBases }: BasicSettingsProps) {
  const { control } = useFormContext<DialogParamsSchema>();
  const t = useTranslations();
  return (
    <div className="space-y-6 px-1">
      <FormField
        control={control}
        name="language"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Language')}</FormLabel>
            <Select
              onValueChange={(value) => {
                if (!value) return;
                field.onChange(value);
              }}
              value={field.value}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="English">{t('English')}</SelectItem>
                <SelectItem value="Chinese">{t('Chinese')}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="space-y-6">
        {/* <h3 className="text-lg font-medium">{t('Knowledge Base Settings')}</h3>
        <FormField
          control={control}
          name="kb_ids"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Knowledge Base')}</FormLabel>
              <FormControl>
                <MultiSelect
                  options={knowledgeBases.map((kb: KnowledgeBase) => ({
                    label: kb.name,
                    value: kb.id
                  }))}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isPending}
                  maxCount={5}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        /> */}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="top_n"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Top N: {field.value}</FormLabel>
                <FormControl>
                  <Slider
                    min={1}
                    max={20}
                    step={1}
                    value={[field.value || 1]}
                    onValueChange={([value]) => field.onChange(value)}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>{t('Max Results Description')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={control}
            name="similarity_threshold"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('Similarity Threshold')}: {field.value}
                </FormLabel>
                <FormControl>
                  <Slider
                    min={0}
                    max={1}
                    step={0.01}
                    value={[field.value || 0]}
                    onValueChange={([value]) => field.onChange(value)}
                    disabled={isPending}
                  />
                </FormControl>
                <FormDescription>{t('Similarity Threshold Description')}</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>
    </div>
  );
}

'use client';

import { type z } from 'zod';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { chunkRetrievalTestSchema } from '@/lib/schema/knowledge/chunk';
import { useTranslations } from 'next-intl';

const formSchema = chunkRetrievalTestSchema.omit({
  kb_ids: true,
  page: true,
  page_size: true
});

export type RetrievalConfigFormValues = z.infer<typeof formSchema>;

interface ConfigFormProps {
  isPending: boolean;
}

const RetrievalConfig = ({ isPending }: ConfigFormProps) => {
  const form = useFormContext<RetrievalConfigFormValues>();
  const t = useTranslations();

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="question"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Source Text')}</FormLabel>
            <FormControl>
              <Textarea
                placeholder={t('Please enter your question')}
                className="min-h-48"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="similarity_threshold"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('Similarity Threshold')} ({field.value})
            </FormLabel>
            <FormControl>
              <Slider
                min={0}
                max={1}
                step={0.01}
                value={[field.value ?? 0]}
                onValueChange={(values) => field.onChange(values[0])}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="vector_similarity_weight"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t('Vector Similarity Weight')} ({field.value})
            </FormLabel>
            <FormControl>
              <Slider
                min={0}
                max={1}
                step={0.1}
                value={[field.value ?? 0]}
                onValueChange={(values) => field.onChange(values[0])}
              />
            </FormControl>
          </FormItem>
        )}
      />

      <div className="flex justify-end">
        <Button type="submit" disabled={isPending} loading={isPending}>
          {t('Test')}
        </Button>
      </div>
    </div>
  );
};
export default RetrievalConfig;

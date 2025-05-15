'use client';

import { useFormContext, useFieldArray } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { PlusIcon, TrashIcon } from 'lucide-react';
import { DataTable } from '@/components/base/data-table';
import { useTranslations } from 'next-intl';
import { type AgentConfigFormValues } from '..';

interface PromptSettingsProps {
  isPending?: boolean;
}

export function PromptSettings({ isPending = false }: PromptSettingsProps) {
  const { control } = useFormContext<AgentConfigFormValues>();
  const t = useTranslations();

  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'agent_config.dialog_config.prompt_config.parameters'
  });

  const columns = [
    {
      accessorKey: 'key',
      header: t('Parameter Name'),
      cell: ({ row }: { row: any }) => (
        <Input
          defaultValue={row.original.key}
          onBlur={(e) => {
            update(row.index, {
              ...row.original,
              key: e.target.value
            });
          }}
          className="w-full"
        />
      )
    },
    {
      id: 'actions',
      header: t('Actions'),
      cell: ({ row }: { row: any }) => (
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t('Optional')}</span>
            <Switch
              checked={row.original.optional}
              onCheckedChange={(checked) => {
                update(row.index, {
                  ...row.original,
                  optional: checked
                });
              }}
            />
          </div>
          <div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive hover:text-destructive/80"
              onClick={() => remove(row.index)}
            >
              <TrashIcon className="h-4 w-4" />
              <span className="sr-only">{t('Delete')}</span>
            </Button>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 px-1">
      <FormField
        control={control}
        name="agent_config.dialog_config.prompt_config.empty_response"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Empty Response')}</FormLabel>
            <FormControl>
              <Input placeholder={t('Empty Response Placeholder')} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="agent_config.dialog_config.prompt_config.prologue"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('Prologue')}</FormLabel>
            <FormControl>
              <Textarea placeholder={t('Prologue Placeholder')} className="resize-y" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="agent_config.dialog_config.prompt_config.system"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t('System Prompt')}</FormLabel>
            <FormControl>
              <Textarea placeholder={t('System Prompt')} className="min-h-32 resize-y" {...field} />
            </FormControl>
            <FormDescription>{t('System Prompt Description')}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="agent_config.dialog_config.prompt_config.parameters"
        render={({ field }) => {
          return (
            <FormItem>
              <div className="flex items-center justify-between">
                <div>
                  <FormLabel>{t('Prompt Parameters')}</FormLabel>
                  <FormDescription>{t('Prompt Parameters Description')}</FormDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ key: '', optional: false })}
                >
                  <PlusIcon className="w-4" />
                  {t('Add Parameter')}
                </Button>
              </div>
              <FormControl>
                <DataTable columns={columns} data={fields} showEmptyState={false} />
              </FormControl>
              <FormMessage />
            </FormItem>
          );
        }}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name="agent_config.dialog_config.prompt_config.quote"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>{t('Show citations')}</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* <FormField
          control={control}
          name="agent_config.dialog_config.prompt_config.keyword"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>{t('Keyword')}</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        /> */}

        {/* <FormField
          control={control}
          name="agent_config.dialog_config.prompt_config.tts"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>{t('Text to Speech')}</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        /> */}

        <FormField
          control={control}
          name="agent_config.dialog_config.prompt_config.refine_multiturn"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>{t('Multi-turn Optimization')}</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        {/* <FormField
          control={control}
          name="agent_config.dialog_config.prompt_config.use_kg"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <FormLabel>{t('Use Knowledge Graph')}</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        /> */}
      </div>
    </div>
  );
}

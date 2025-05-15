import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { type z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { InputTags } from '@/components/ui/input-tags';
import { ExampleInput } from '@/components/ui/example-input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useTranslations } from 'next-intl';
import { skillSchema, type AgentCreateSchema } from '@/lib/schema/agent';
import { generateRandomString } from '@/lib/utils/tools';

type Skill = NonNullable<AgentCreateSchema['skills']>[number];

interface SkillFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Skill) => void;
  initialData?: Skill;
}

type SkillFormData = z.infer<typeof skillSchema>;

export default function SkillFormModal({
  open,
  onOpenChange,
  onSubmit,
  initialData
}: SkillFormModalProps) {
  const t = useTranslations();

  const form = useForm<SkillFormData>({
    resolver: zodResolver(skillSchema),
    defaultValues: {
      id: generateRandomString(16),
      name: '',
      description: '',
      tags: null,
      examples: null,
      inputModes: null,
      outputModes: null
    }
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset(initialData);
      } else {
        form.reset();
      }
    }
  }, [open, initialData]);

  const handleSubmit = (values: SkillFormData) => {
    onSubmit(values);
    onOpenChange(false);
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {initialData ? t('Edit Skill') : t('Add Skill')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Name')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="inputModes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Input Modes')}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange([value])}
                      defaultValue={field.value?.[0] || 'text'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select input mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="outputModes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Output Modes')}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange([value])}
                      defaultValue={field.value?.[0] || 'text'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select output mode" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Tags')}</FormLabel>
                  <FormControl>
                    <InputTags
                      value={field.value || []}
                      onChange={(newTags) => field.onChange(newTags)}
                      placeholder={t('Type and press Enter to add tags')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="examples"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Examples')}</FormLabel>
                  <FormControl>
                    <ExampleInput
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t('Type an example')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>
                {t('Cancel')}
              </Button>
              <Button type="submit">{initialData ? t('Save') : t('Add')}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

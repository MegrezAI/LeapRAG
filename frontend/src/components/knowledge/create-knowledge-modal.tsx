'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { toast } from 'sonner';
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
import { useTranslations } from 'next-intl';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useCreateKnowledgeBase } from '@/lib/hooks/queries/use-knowledge';
import { useRouter } from 'next/navigation';
import { useLLMs } from '@/lib/hooks/queries/use-llm';

const formSchema = z.object({
  name: z.string().min(1),
  language: z.string().min(1)
});

type FormValues = z.infer<typeof formSchema>;

interface CreateKnowledgeBaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateKnowledgeBaseModal({
  open,
  onOpenChange
}: CreateKnowledgeBaseModalProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      language: 'English'
    }
  });
  const t = useTranslations();
  const router = useRouter();
  const { data: llms } = useLLMs();

  const { mutate: create, isPending } = useCreateKnowledgeBase({
    onSuccess: (data) => {
      onOpenChange(false);
      toast.success(t('Created Successfully'));
      router.push(`/knowledge/${data.id}/dataset`);
      form.reset();
    },
    onError: () => {
      toast.error(t('Create Failed'));
    }
  });

  const onSubmit = (values: FormValues) => {
    if (!llms || Object.keys(llms).length === 0) {
      toast.warning(t('Please first add and configure a system model'));
      return;
    }
    create(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Create Knowledge Base')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Name')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('Input Knowledge Base Name')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('Language')}</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={(value) => {
                        if (!value) return;
                        field.onChange(value);
                      }}
                      value={field.value}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="English">English</SelectItem>
                        <SelectItem value="Chinese">中文</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {t('Create')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

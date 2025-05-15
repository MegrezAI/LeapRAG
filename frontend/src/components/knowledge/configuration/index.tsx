'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { knowledgeSchema, type KnowledgeSchema } from '@/lib/schema/knowledge/knowledge';
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
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SpinLoader from '@/components/base/loader/spin-loader';
import {
  useKnowledgeBase,
  useSetKnowledgeBaseQueryData,
  useUpdateKnowledgeBase
} from '@/lib/hooks/queries/use-knowledge';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { transformFile2Base64 } from '@/lib/utils/file';

interface ConfigurationProps {
  kbId: string;
}

const Configuration = ({ kbId }: ConfigurationProps) => {
  const t = useTranslations();
  const form = useForm<KnowledgeSchema>({
    resolver: zodResolver(knowledgeSchema),
    defaultValues: {
      name: '',
      avatar: '',
      description: '',
      language: '',
      permission: ''
    }
  });
  const { data: knowledgeBase, isLoading } = useKnowledgeBase(kbId);
  const setQueryData = useSetKnowledgeBaseQueryData();
  const { mutateAsync: updateKnowledgeBase, isPending } = useUpdateKnowledgeBase({
    onSuccess: (response, variables) => {
      setQueryData(kbId, (oldData) => {
        if (!oldData) return response;
        return {
          ...oldData,
          ...variables.data
        };
      });
      toast.success(t('Updated Successfully'));
    },
    onError: () => {}
  });

  useEffect(() => {
    if (knowledgeBase) {
      form.reset(knowledgeBase);
    }
  }, [kbId, knowledgeBase, form]);

  if (isLoading) return <SpinLoader />;

  const onSubmit = async (data: KnowledgeSchema) => {
    try {
      if (data.avatar instanceof File) {
        data.avatar = await transformFile2Base64(data.avatar);
      }
      await updateKnowledgeBase({ id: kbId, data });
    } catch (error) {}
  };

  return (
    <div className="w-full sm:max-w-2xl p-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Knowledge Base') + t('Name')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="avatar"
            render={({ field: { onChange, value, ...field } }) => (
              <FormItem>
                <FormLabel>{t('Knowledge Base Image')}</FormLabel>
                <div className="w-fit">
                  <label htmlFor="knowledge-base-avatar-upload" className="cursor-pointer">
                    <Avatar className="size-24 rounded-md">
                      {value ? (
                        <AvatarImage
                          src={typeof value === 'string' ? value : URL.createObjectURL(value)}
                          alt={form.getValues('name')}
                        />
                      ) : (
                        <AvatarFallback className="rounded-sm">
                          <Upload className="size-4" />
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </label>
                </div>
                <FormControl>
                  <Input
                    id="knowledge-base-avatar-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onChange(file);
                      }
                    }}
                    {...field}
                  />
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
                  <Textarea className="min-h-[100px]" {...field} value={field.value || ''} />
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

          {/* <FormField
            control={form.control}
            name="permission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Permission')}</FormLabel>
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
                    <SelectItem value="team">{t('Team')}</SelectItem>
                    <SelectItem value="me">{t('Only Me')}</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          /> */}

          <div className="flex justify-end pt-4">
            <Button type="submit" disabled={isPending} loading={isPending}>
              {t('Save')}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default Configuration;

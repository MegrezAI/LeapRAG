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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload } from 'lucide-react';
import { transformFile2Base64 } from '@/lib/utils/file';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  useUpdateKnowledgeBase,
  useSetKnowledgeBaseQueryData
} from '@/lib/hooks/queries/use-knowledge';

interface EditKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  kbId: string;
  data: KnowledgeSchema;
}

const EditKnowledgeModal = ({ isOpen, onClose, data, kbId }: EditKnowledgeModalProps) => {
  const t = useTranslations();
  const setQueryData = useSetKnowledgeBaseQueryData();

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
      onClose();
    },
    onError: () => {}
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        ...data,
        description: data.description || ''
      });
    }
  }, [isOpen, data]);

  const onSubmit = async (formData: KnowledgeSchema) => {
    try {
      if (formData.avatar instanceof File) {
        formData.avatar = await transformFile2Base64(formData.avatar);
      }
      await updateKnowledgeBase({ id: kbId, data: formData });
    } catch (error) {}
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('Knowledge Base Information')}</DialogTitle>
        </DialogHeader>
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={isPending} loading={isPending}>
                {t('Save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default EditKnowledgeModal;

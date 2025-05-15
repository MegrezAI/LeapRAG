'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updateUsernameApi } from '@/api/account';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { type z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { modifyUsernameSchema, type ModifyUsernameSchema } from '@/lib/schema/account/account';
import { useTranslations } from 'next-intl';
import useUserStore from '@/store/account';

export function ModifyUsername() {
  const t = useTranslations();
  const userInfo = useUserStore((state) => state.userInfo);
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<ModifyUsernameSchema>({
    resolver: zodResolver(modifyUsernameSchema),
    defaultValues: {
      username: userInfo?.account?.username || ''
    }
  });

  const onSubmit = async (data: ModifyUsernameSchema) => {
    try {
      const response = await updateUsernameApi(data.username);
      setIsEditing(false);
      setUserInfo(response);
      toast.success(t('Username changed successfully'));
    } catch (error) {}
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <Label>{t('Username')}</Label>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <FormControl>
                      <Input {...field} className="flex-1" disabled={form.formState.isSubmitting} />
                    </FormControl>
                    <Button variant="outline" size="sm" disabled={form.formState.isSubmitting}>
                      {t('Save')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setIsEditing(false);
                        form.reset();
                      }}
                      disabled={form.formState.isSubmitting}
                    >
                      {t('Cancel')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Input {...field} disabled className="flex-1" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsEditing(true);
                      }}
                    >
                      {t('Edit')}
                    </Button>
                  </>
                )}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}

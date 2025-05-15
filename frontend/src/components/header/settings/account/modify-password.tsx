'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { updatePasswordApi } from '@/api/account';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { updatePasswordSchema, type UpdatePasswordSchema } from '@/lib/schema/account/account';
import { useTranslations } from 'next-intl';

export function ModifyPassword() {
  const t = useTranslations();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<UpdatePasswordSchema>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: {
      password: '',
      new_password: '',
      repeat_new_password: ''
    }
  });

  const onSubmit = async (data: UpdatePasswordSchema) => {
    try {
      await updatePasswordApi({
        password: data.password,
        new_password: data.new_password,
        repeat_new_password: data.repeat_new_password
      });
      setIsDialogOpen(false);
      form.reset();
      toast.success(t('Password changed successfully'));
    } catch (error) {}
  };

  return (
    <div className="space-y-2">
      <Label>{t('Password')}</Label>
      <div className="flex gap-2">
        <Input type="password" value="**************" disabled />
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">{t('Reset Password')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('Update Password')}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <Label>{t('Current Password')}</Label>
                      <FormControl>
                        <Input type="password" {...field} disabled={form.formState.isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="new_password"
                  render={({ field }) => (
                    <FormItem>
                      <Label>{t('New Password')}</Label>
                      <FormControl>
                        <Input type="password" {...field} disabled={form.formState.isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="repeat_new_password"
                  render={({ field }) => (
                    <FormItem>
                      <Label>{t('Confirm New Password')}</Label>
                      <FormControl>
                        <Input type="password" {...field} disabled={form.formState.isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setIsDialogOpen(false);
                      form.reset();
                    }}
                    disabled={form.formState.isSubmitting}
                  >
                    {t('Cancel')}
                  </Button>
                  <Button type="submit" variant="default" disabled={form.formState.isSubmitting}>
                    {t('Update Password')}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

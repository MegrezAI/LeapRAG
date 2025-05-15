'use client';
import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
// import Alert from '@/components/base/Alert';
import { type z } from 'zod';
import { type emailSchema } from '@/lib/schema/account/account';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Form, FormControl, FormField, FormItem, FormMessage } from '../ui/form';
import { Input } from '../ui/input';

export function ForgetPassword() {
  const t = useTranslations();
  const form = useForm<z.infer<typeof emailSchema>>({
    mode: 'onChange',
    defaultValues: {
      email: ''
    }
  });
  const [isLoading, setIsLoading] = useState(false);
  const onForgetPasswordUserFormSubmit = useCallback(
    async ({ email }: z.infer<typeof emailSchema>) => {
      setIsLoading(true);
      try {
      } catch (error: any) {
        console.error(error);
        if (error && error.errorCode) {
          console.log(error.errorCode);
          toast.error(t(`Failed to reset password, please contact support`));
        } else if (error && error.message) {
          toast.error(error.message);
        } else if (typeof error === 'string') {
          toast.error(error);
        }
      } finally {
        setIsLoading(false);
      }
    },
    []
  );
  return (
    <section className="flex h-full justify-center items-center">
      <div className="container">
        <div className="-mx-4 flex flex-wrap">
          <div className="w-full px-4">
            <div className="shadow-three mx-auto max-w-[500px] rounded bg-white px-6 py-10 dark:bg-dark sm:p-[60px]">
              <h1 className="my-4 text-center text-2xl font-semibold">{t('Reset password')}</h1>

              <Form {...form}>
                <form onSubmit={form.handleSubmit((data) => onForgetPasswordUserFormSubmit(data))}>
                  <div className="mb-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              className="py-5 dark:border-muted-foreground"
                              placeholder={t('Email')}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="mb-6">
                    <Button
                      aria-label="Sign in"
                      disabled={isLoading}
                      loading={isLoading}
                      type="submit"
                      className="w-full"
                    >
                      {t('Reset password')}
                    </Button>
                  </div>
                </form>
              </Form>
              <p className="my-4  text-end text-sm text-muted-foreground">
                {t('Back')}
                <Link
                  className="p-1 font-medium text-blue-500 hover:underline cursor-pointer"
                  href="/sign-in"
                >
                  {t('Sign in')}
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

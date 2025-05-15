'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@/lib/schema/account/account';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { type z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { getCurrentLocale } from '@/lib/utils/locale';
import { signUpAndSignIn } from '@/services/auth';
import LeapRAGIcon from '../icon/leap-rag-icon';

export function SignUpForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [isLoading, setIsLoading] = useState(false);

  const t = useTranslations();
  const router = useRouter();
  const locale = getCurrentLocale();

  const form = useForm<z.infer<typeof registerSchema>>({
    mode: 'onChange',
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      validationCode: ''
    }
  });

  const onSubmit = useCallback(
    async (data: z.infer<typeof registerSchema>) => {
      setIsLoading(true);
      try {
        await signUpAndSignIn({ email: data.email, password: data.password });
        toast.success('Registration Successful');
        router.push('/knowledge');
      } catch (error: any) {
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  return (
    <div className={cn('flex flex-col gap-6 w-[300px]', className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="relative">
          <LeapRAGIcon size="xl" />
        </div>
        <span className="text-xl font-bold">{t('Register Account')}</span>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Email')}</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Password')}</FormLabel>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* <FormField
            control={form.control}
            name="validationCode"
            render={({ field }) => (
              <VerificationCodeInput
                email={form.watch('email')}
                onSendCode={handleSendCode}
                value={field.value}
                onChange={field.onChange}
                error={form.formState.errors.validationCode?.message}
              />
            )}
          /> */}

          <Button
            aria-label="Sign up"
            disabled={isLoading}
            loading={isLoading}
            type="submit"
            className="w-full"
          >
            {t('Sign up')}
          </Button>
        </form>
      </Form>
      <p className="text-center text-sm text-body-color">
        {t('Already have an account?')} {''}
        <Link href="/sign-in" className="text-primary hover:underline">
          {t('Sign in')}
        </Link>
      </p>
    </div>
  );
}

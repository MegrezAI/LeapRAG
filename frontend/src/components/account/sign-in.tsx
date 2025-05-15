'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/schema/account/account';
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
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { signIn } from '@/services/auth';
import LeapRAGIcon from '../icon/leap-rag-icon';

export function SignInForm({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const t = useTranslations();
  const form = useForm<z.infer<typeof loginSchema>>({
    mode: 'onChange',
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = useCallback(async (data: z.infer<typeof loginSchema>) => {
    setIsLoading(true);
    try {
      const response = await signIn({ email: data.email, password: data.password });
      if (!response) return;
      router.push('/knowledge');
      toast.success(t('Login Successful'));
    } catch (error: any) {
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className={cn('flex flex-col gap-6 w-[300px]', className)} {...props}>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="relative">
          <LeapRAGIcon size="xl" />
        </div>
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
                <div className="flex items-center">
                  <FormLabel>{t('Password')}</FormLabel>
                  {/* <Button variant="link" className="p-0" asChild>
                    <Link
                      href="forget-password"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      {t('Forgot Password?')}
                    </Link>
                  </Button> */}
                </div>
                <FormControl>
                  <Input type="password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            aria-label="Sign in"
            disabled={isLoading}
            loading={isLoading}
            type="submit"
            className="w-full"
          >
            {t('Sign in')}
          </Button>
          {/* <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              {t('or')}
            </span>
          </div>

          <Button variant="outline" type="button" className="w-full gap-2">
            <span className="google-icon size-4"></span>
            {t('Sign in with Google')}
          </Button> */}

          <div className="text-center text-sm">
            {t('Don&apos;t have an account?')} {''}
            <Button variant="link" className="p-0" asChild>
              <Link href="/sign-up" className="text-primary hover:underline">
                {t('Register Account')}
              </Link>
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

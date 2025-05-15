'use client';
import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { AlertTriangle, type LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface ErrorCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  retryLink?: string;
  retryLinkText?: string;
  className?: string;
  showReset?: boolean;
  backHome?: boolean;
}

export function ErrorCard({
  icon,
  title,
  description,
  retryLink,
  retryLinkText,
  className,
  showReset,
  backHome,
  ...props
}: ErrorCardProps) {
  const Icon = icon ?? AlertTriangle;
  const t = useTranslations();
  const router = useRouter();

  const defaultTitle = t('Oops! Something Went Wrong');
  const defaultDescription = t(
    'There was a little issue, Please refresh the page or try again later'
  );
  const defaultRetryLinkText = backHome ? t('Back to Home') : t('Back');

  return (
    <Card className={cn('grid border place-items-center', className)} {...props}>
      <CardHeader>
        <div className="grid h-20 w-20 place-items-center rounded-full bg-muted">
          <Icon className="h-10 w-10" aria-hidden="true" />
        </div>
      </CardHeader>
      <CardContent className="flex min-h-[176px] flex-col items-center justify-center space-y-4 text-center">
        <CardTitle className="text-2xl">{title ?? defaultTitle}</CardTitle>
        <CardDescription>{description ?? defaultDescription}</CardDescription>
      </CardContent>
      <CardFooter>
        {showReset ? (
          <div
            onClick={() => (backHome ? router.push('/') : router.back())}
            className={cn(
              buttonVariants({
                variant: 'ghost'
              }),
              'cursor-pointer'
            )}
          >
            {retryLinkText ?? defaultRetryLinkText}
            <span className="sr-only">{retryLinkText ?? defaultRetryLinkText}</span>
          </div>
        ) : retryLink ? (
          <Link href={retryLink}>
            <div
              className={cn(
                buttonVariants({
                  variant: 'ghost'
                })
              )}
            >
              {retryLinkText ?? defaultRetryLinkText}
            </div>
          </Link>
        ) : null}
      </CardFooter>
    </Card>
  );
}

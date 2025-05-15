import * as React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { type ButtonProps, buttonVariants } from '@/components/ui/button';

const Pagination = ({ className, ...props }: React.ComponentProps<'nav'>) => (
  <nav
    role="navigation"
    aria-label="pagination"
    className={cn('mx-auto flex w-full justify-center', className)}
    {...props}
  />
);

const PaginationContent = React.forwardRef<HTMLUListElement, React.ComponentProps<'ul'>>(
  ({ className, ...props }, ref) => (
    <ul ref={ref} className={cn('flex flex-row items-center gap-1', className)} {...props} />
  )
);
PaginationContent.displayName = 'PaginationContent';

const PaginationItem = React.forwardRef<HTMLLIElement, React.ComponentProps<'li'>>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn('hover:cursor-pointer', className)} {...props} />
  )
);
PaginationItem.displayName = 'PaginationItem';

type PaginationLinkProps = {
  isActive?: boolean;
  disabled?: boolean;
  href: string;
} & Pick<ButtonProps, 'size'> &
  Omit<React.ComponentProps<typeof Link>, 'href'>;

const PaginationLink = ({
  className,
  isActive,
  size = 'sm',
  disabled = false,
  href,
  ...props
}: PaginationLinkProps) => {
  return disabled ? (
    <span
      aria-disabled="true"
      className={cn(
        buttonVariants({
          variant: isActive ? 'default' : 'ghost',
          size
        }),
        'cursor-not-allowed pointer-events-none',
        className
      )}
      {...props}
    />
  ) : (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        buttonVariants({
          variant: isActive ? 'default' : 'ghost',
          size
        }),
        className
      )}
      {...props}
    />
  );
};
PaginationLink.displayName = 'PaginationLink';

const PaginationPrevious = ({
  className,
  ...props
}: React.ComponentProps<typeof PaginationLink>) => {
  const t = useTranslations();
  return (
    <PaginationItem>
      <PaginationLink
        aria-label={t('Previous')}
        size="default"
        className={cn('gap-1 pl-2.5', className)}
        {...props}
      >
        <ChevronLeft className="h-4 w-4" />
        {/* <span>{t('Previous')}</span> */}
      </PaginationLink>
    </PaginationItem>
  );
};
PaginationPrevious.displayName = 'PaginationPrevious';

const PaginationNext = ({ className, ...props }: React.ComponentProps<typeof PaginationLink>) => {
  const t = useTranslations();
  return (
    <PaginationItem>
      <PaginationLink
        aria-label={t('Next')}
        size="default"
        className={cn('gap-1 pr-2.5', className)}
        {...props}
      >
        {/* <span>{t('Next')}</span> */}
        <ChevronRight className="h-4 w-4" />
      </PaginationLink>
    </PaginationItem>
  );
};

const PaginationEllipsis = ({ className, ...props }: React.ComponentProps<'span'>) => {
  const t = useTranslations();
  return (
    <PaginationItem>
      <span
        aria-hidden
        className={cn('flex h-9 w-9 items-center justify-center', className)}
        {...props}
      >
        <MoreHorizontal className="h-4 w-4" />
        <span className="sr-only">{t('More pages')}</span>
      </span>
    </PaginationItem>
  );
};

export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
};

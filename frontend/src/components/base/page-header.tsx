'use client';

import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title?: string;
  className?: string;
  children?: React.ReactNode;
}

const PageHeader = ({ title = '', className, children }: PageHeaderProps) => {
  return (
    <header className={cn('flex items-center justify-between p-4 border-b', className)}>
      <h1 className="text-xl font-bold">{title}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
};

export default PageHeader;

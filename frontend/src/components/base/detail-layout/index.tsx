import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DetailLayoutProps {
  children: ReactNode;
  sidebar: ReactNode;
  className?: string;
  mainContentClassName?: string;
}

export function DetailLayout({
  children,
  sidebar,
  className,
  mainContentClassName
}: DetailLayoutProps) {
  return (
    <div className={cn('flex w-full h-full', className)}>
      <SidebarProvider defaultOpen={true} className="min-h-[calc(100vh-3.5rem)]">
        {sidebar}
        <SidebarInset className={cn('flex-1 overflow-auto', mainContentClassName)}>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}

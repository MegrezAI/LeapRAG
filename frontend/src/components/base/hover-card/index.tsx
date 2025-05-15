import React from 'react';
import { cn } from '@/lib/utils';
import {
  HoverCard as HoverCardComponent,
  HoverCardTrigger,
  HoverCardContent
} from '@/components/ui/hover-card';

interface HoverCardProps extends React.RefAttributes<HTMLDivElement> {
  children: React.ReactNode;
  content: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  align?: 'start' | 'center' | 'end';
  className?: string;
  openDelay?: number;
  closeDelay?: number;
}

export function HoverCard({
  children,
  content,
  open,
  align = 'center',
  defaultOpen,
  onOpenChange,
  className,
  openDelay = 100,
  closeDelay = 100,
  ...props
}: HoverCardProps) {
  return (
    <HoverCardComponent
      open={open}
      defaultOpen={defaultOpen}
      onOpenChange={onOpenChange}
      openDelay={openDelay}
      closeDelay={closeDelay}
    >
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className={cn(className)} align={align} {...props}>
        {content}
      </HoverCardContent>
    </HoverCardComponent>
  );
}

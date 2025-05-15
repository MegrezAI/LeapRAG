import React from 'react';
import { cn } from '@/lib/utils';
import {
  Tooltip as TooltipComponent,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '@/components/ui/tooltip';
import { InfoIcon } from 'lucide-react';

interface TooltipProps extends React.RefAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  content: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: 'top' | 'bottom' | 'left' | 'right';
  align?: 'start' | 'center' | 'end';
  className?: string;
  delayDuration?: number;
  withIcon?: boolean;
  iconClassName?: string;
}

export function Tooltip({
  children,
  content,
  open,
  size = 'top',
  align = 'center',
  defaultOpen,
  onOpenChange,
  className,
  delayDuration = 100,
  withIcon = false,
  iconClassName = 'ml-1.5 h-4 w-4 text-muted-foreground',
  ...props
}: TooltipProps) {
  const trigger = withIcon ? (
    <>
      {children}
      <InfoIcon className={iconClassName} />
    </>
  ) : (
    children
  );

  return (
    <TooltipProvider delayDuration={delayDuration}>
      <TooltipComponent open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}>
        <TooltipTrigger asChild className="flex items-center">
          {withIcon && !children ? <InfoIcon className={iconClassName} /> : trigger}
        </TooltipTrigger>
        <TooltipContent
          className={cn('bg-black/80 rounded-md text-white max-w-[300px] break-words', className)}
          side={size}
          align={align}
          {...props}
        >
          {content}
          {/* <TooltipPrimitive.Arrow width={11} height={5} /> */}
        </TooltipContent>
      </TooltipComponent>
    </TooltipProvider>
  );
}

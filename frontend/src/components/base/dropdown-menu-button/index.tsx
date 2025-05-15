'use client';

import { type ReactNode, useState } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface BaseMenuItem {
  label?: string;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

interface ActionMenuItem extends BaseMenuItem {
  type?: 'item';
  label: string;
  onClick?: () => void;
}

interface CheckboxMenuItem extends BaseMenuItem {
  type: 'checkbox';
  label: string;
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

interface SeparatorMenuItem {
  type: 'separator';
}

export type MenuItemProps = ActionMenuItem | CheckboxMenuItem | SeparatorMenuItem;

interface DropdownMenuButtonProps {
  items: MenuItemProps[];
  triggerContent?: ReactNode;
  triggerIcon?: ReactNode;
  triggerClassName?: string;
  buttonProps?: Omit<ButtonProps, 'className'>;
  menuContentClassName?: string;
  align?: 'start' | 'end' | 'center';
}

export function DropdownMenuButton({
  items,
  triggerContent,
  triggerIcon = <MoreHorizontal className="size-4" />,
  triggerClassName,
  buttonProps,
  menuContentClassName,
  align = 'end'
}: DropdownMenuButtonProps) {
  const [open, setOpen] = useState(false);

  const handleItemClick = (e: React.MouseEvent, onClick?: () => void) => {
    e.preventDefault();
    e.stopPropagation();
    onClick?.();
    setOpen(false);
  };

  const renderMenuItem = (item: MenuItemProps, index: number) => {
    if (item.type === 'separator') {
      return <DropdownMenuSeparator key={index} />;
    }

    if (item.type === 'checkbox') {
      return (
        <DropdownMenuCheckboxItem
          key={index}
          checked={item.checked}
          onCheckedChange={item.onCheckedChange}
          disabled={item.disabled}
          className={cn('cursor-pointer', item.className)}
        >
          {item.icon && <span className="mr-2">{item.icon}</span>}
          {item.label}
        </DropdownMenuCheckboxItem>
      );
    }

    return (
      <DropdownMenuItem
        key={index}
        onClick={(e) => handleItemClick(e, item.onClick)}
        disabled={item.disabled}
        className={cn('cursor-pointer', item.className)}
      >
        {item.icon && <span className="mr-2">{item.icon}</span>}
        {item.label}
      </DropdownMenuItem>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          {...buttonProps}
          className={cn(triggerClassName)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {triggerContent || triggerIcon}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className={cn(menuContentClassName)}>
        {items.map(renderMenuItem)}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

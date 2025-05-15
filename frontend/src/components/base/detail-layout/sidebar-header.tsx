'use client';

import * as React from 'react';
import { Pencil, Trash } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { useTranslations } from 'next-intl';
import { Badge } from '../../ui/badge';
import { cn } from '@/lib/utils';

export interface MenuAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
  disabled?: boolean;
}

export interface SidebarHeaderProps {
  title: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  menuActions?: MenuAction[];
  className?: string;
  buttonClassName?: string;
  dropdownClassName?: string;
}

export function SidebarHeader({
  title,
  icon,
  badge,
  menuActions = [],
  className,
  buttonClassName,
  dropdownClassName
}: SidebarHeaderProps) {
  return (
    <SidebarMenu className={className}>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                'data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground pointer-events-none',
                buttonClassName
              )}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                {icon}
              </div>
              <div className="flex flex-col">
                <span className="truncate font-semibold">{title}</span>
                {badge}
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className={cn(
              'w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg',
              dropdownClassName
            )}
            align="start"
            side="bottom"
            sideOffset={4}
          >
            {menuActions.map((action, index) => (
              <DropdownMenuItem
                key={index}
                className={cn('cursor-pointer', action.className)}
                onClick={action.onClick}
                disabled={action.disabled}
              >
                <div className="flex size-6 items-center justify-center rounded-sm">
                  {action.icon}
                </div>
                <div className="font-medium">{action.label}</div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}

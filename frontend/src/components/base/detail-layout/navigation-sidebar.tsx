'use client';

import * as React from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar
} from '@/components/ui/sidebar';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MenuItem {
  name: string;
  path: string;
  icon: LucideIcon;
}

interface NavigationSidebarProps extends React.ComponentProps<typeof Sidebar> {
  headerComponent: React.ReactNode;
  menus: MenuItem[];
  basePath: string;
  id: string;
  collapsible?: 'offcanvas' | 'icon' | 'none';
}

export function NavigationSidebar({
  headerComponent,
  menus,
  basePath,
  id,
  className,
  collapsible = 'icon',
  ...props
}: NavigationSidebarProps) {
  const { setOpenMobile } = useSidebar();
  const pathname = usePathname();

  return (
    <Sidebar className={cn('pt-14', className)} collapsible={collapsible} {...props}>
      <SidebarHeader>{headerComponent}</SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menus.map((menu) => (
                <SidebarMenuItem key={menu.name}>
                  <SidebarMenuButton asChild isActive={pathname.includes(menu.path)}>
                    <Link
                      href={`/${basePath}/${id}/${menu.path}`}
                      onClick={() => setOpenMobile(false)}
                    >
                      <menu.icon className="size-4" />
                      <span>{menu.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarTrigger className="-ml-1" />
      </SidebarFooter>
    </Sidebar>
  );
}

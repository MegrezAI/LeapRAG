'use client';
import { Menu } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '../ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { useIsMobile } from '@/lib/hooks/use-mobile';

interface Tab {
  icon: React.ReactNode;
  value: string;
  label: string;
  link: string;
  children?: string[];
}

interface MobileMenuProps {
  tabs: Tab[];
}

const MobileMenu = ({ tabs }: MobileMenuProps) => {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  // 当从移动设备切换到桌面设备时，关闭菜单
  useEffect(() => {
    if (!isMobile) {
      setIsMenuOpen(false);
    }
  }, [isMobile]);

  return (
    <div className="sm:hidden">
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild className="focus-visible:ring-0 focus-visible:ring-offset-0">
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Menu className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {tabs.map((tab) => (
            <DropdownMenuItem
              key={tab.link}
              asChild
              className={
                pathname.startsWith(tab.link) ||
                tab.children?.some((child) => pathname.startsWith(child))
                  ? 'bg-accent text-accent-foreground'
                  : ''
              }
            >
              <Link href={tab.link} className="flex items-center gap-2">
                {tab.icon}
                {tab.label}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default MobileMenu;

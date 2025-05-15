'use client';
import React, { Fragment, useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import useUserStore from '@/store/account';
import { useShallow } from 'zustand/shallow';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { LogoutApi } from '@/api/account';
import SettingsModal from './settings';
import { getCurrentLocale } from '@/lib/utils/locale';
import { Settings, LogOut, BookOpen, SquareActivity } from 'lucide-react';

const AccountMenu = () => {
  const t = useTranslations();
  const router = useRouter();
  const locale = getCurrentLocale();

  const [openSettings, setOpenSettings] = useState(false);
  const { userInfo } = useUserStore(
    useShallow((state) => ({
      userInfo: state.userInfo
    }))
  );

  const handleLogout = async () => {
    try {
      await LogoutApi();
      localStorage.removeItem('setup_status');
      localStorage.removeItem('console_token');
      localStorage.removeItem('refresh_token');
      toast.success(t('Logout successful'));
      router.push('/sign-in');
    } catch (error) {
      toast.error(t('Logout failed'));
    }
  };

  const accountMenu = [
    {
      name: t('Settings'),
      icon: <Settings className="size-4" />,
      onClick: () => setOpenSettings(true)
    },
    {
      name: t('System'),
      icon: <SquareActivity className="size-4" />,
      onClick: () => router.push('/system')
    },
    {
      name: t('Docs'),
      icon: <BookOpen className="size-4" />,
      onClick: () => window.open(`/${locale}/docs`, '_blank', 'noopener,noreferrer')
    },
    {
      name: t('Log out'),
      icon: <LogOut className="size-4" />,
      onClick: handleLogout
    }
  ];

  return (
    <div className="flex flex-col sm:gap-4">
      <SettingsModal open={openSettings} setOpen={setOpenSettings} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-0"
          >
            <Avatar className="size-8">
              <AvatarImage src={userInfo?.account.avatar ?? ''} />
              <AvatarFallback>{userInfo?.account.email.charAt(0).toUpperCase()}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>{userInfo?.account.email}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {accountMenu.map((item) => (
            <Fragment key={item.name}>
              {item.name === t('Log out') && <DropdownMenuSeparator />}
              <DropdownMenuItem className="cursor-pointer" onClick={item.onClick}>
                {item.icon}
                {item.name}
              </DropdownMenuItem>
            </Fragment>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AccountMenu;

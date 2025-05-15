'use client';
import React, { useEffect } from 'react';
import type { ReactNode } from 'react';
import useUserStore from '@/store/account';
import { updateInterfaceLanguageApi } from '@/api/account';
import SpinLoader from '@/components/base/loader/spin-loader';
import { defaultLocale, type LanguageEnum } from '@/lib/constants/language';
import { getCurrentLocale } from '@/lib/utils/locale';
import { setUserLocale } from '@/server/actions/locale';
import { useCurrentAccount } from '@/lib/hooks/queries/use-current-accout';
const MainClient = ({ children }: { children: ReactNode }) => {
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const locale = getCurrentLocale();
  const { data, isLoading } = useCurrentAccount();

  useEffect(() => {
    if (data) {
      setUserInfo(data);
      if (locale !== data.account.interface_language) {
        updateInterfaceLanguageApi(data.account.interface_language ?? defaultLocale);
        setUserLocale((data.account.interface_language as LanguageEnum) ?? defaultLocale);
      }
    }
  }, [data, setUserInfo]);

  if (isLoading) {
    return <SpinLoader />;
  }

  return children;
};

export default MainClient;

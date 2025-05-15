'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslations } from 'next-intl';
import useUserStore from '@/store/account';

export function ModifyEmail() {
  const t = useTranslations();
  const userInfo = useUserStore((state) => state.userInfo);

  return (
    <div className="space-y-2">
      <Label htmlFor="email">{t('Email')}</Label>
      <Input id="email" value={userInfo?.account?.email} disabled />
    </div>
  );
}

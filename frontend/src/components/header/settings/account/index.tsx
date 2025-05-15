'use client';

import { SettingsHeader } from '../settings-header';
import { ModifyAvatar } from './modify-avatar';
import { ModifyUsername } from './modify-username';
import { ModifyEmail } from './modify-email';
import { ModifyPassword } from './modify-password';

interface SettingsAccountProps {
  headerTitle: string;
}

export function SettingsAccount({ headerTitle }: SettingsAccountProps) {
  return (
    <div className="space-y-6">
      <SettingsHeader title={headerTitle} />
      <ModifyAvatar />
      <ModifyUsername />
      <ModifyEmail />
      <ModifyPassword />
    </div>
  );
}

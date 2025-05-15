'use client';

import { SettingsHeader } from '../settings-header';
import { ModifyLanguage } from './modify-language';
import { ModifyTimezone } from './modify-timezone';

interface SettingsLanguageProps {
  headerTitle: string;
}

export function SettingsLanguage({ headerTitle }: SettingsLanguageProps) {
  return (
    <div className="space-y-6">
      <SettingsHeader title={headerTitle} />
      <div className="space-y-4">
        <ModifyLanguage />
        <ModifyTimezone />
      </div>
    </div>
  );
}

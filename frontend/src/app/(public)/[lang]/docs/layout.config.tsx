import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import LeapRAGIcon from '@/components/icon/leap-rag-icon';

export const baseOptions: BaseLayoutProps = {
  i18n: true,
  disableThemeSwitch: true,
  nav: {
    title: (
      <div className="relative flex items-center space-x-2">
        <LeapRAGIcon />
      </div>
    )
  }
};

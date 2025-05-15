'use client';

import Heading from '../typography/heading';
import SubTitle from '../typography/sub-title';
import { cn } from '@/lib/utils';
import { PackageOpen } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface EmptyStateProps {
  title?: string;
  icon?: React.ReactNode;
  subtitle?: string;
  className?: string;
}

const EmptyState = ({ title, icon, subtitle, className }: EmptyStateProps) => {
  const t = useTranslations();

  const defaultTitle = t('No Data');
  const defaultSubtitle = t('There is no data to display at the moment');
  const defaultIcon = <PackageOpen strokeWidth={'0.6'} size={100} aria-hidden="true" />;

  return (
    <div className={cn(`h-[60vh] flex flex-col gap-2 justify-center items-center`, className)}>
      {icon || defaultIcon}
      <Heading center title={title || defaultTitle} />
      <SubTitle center subTitle={subtitle || defaultSubtitle} />
    </div>
  );
};

export default EmptyState;

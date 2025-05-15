import React from 'react';
import { cn } from '@/lib/utils';

interface SubTitleProps {
  subTitle: string;
  center?: boolean;
  className?: string;
}

const SubTitle = ({ subTitle, center, className }: SubTitleProps) => {
  return (
    <p
      className={cn(
        'font-medium text-gray-800 dark:text-gray-100',
        center ? 'text-center' : 'text-left',
        className
      )}
    >
      {subTitle}
    </p>
  );
};

export default SubTitle;

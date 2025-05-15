import React from 'react';
import { cn } from '@/lib/utils';

interface HeadingProps {
  title: string;
  center?: boolean;
  className?: string;
}
const Heading = ({ title, center, className }: HeadingProps) => {
  return (
    <h1 className={cn(`text-lg font-medium ${center ? 'text-center' : 'text-left'}`, className)}>
      {title}
    </h1>
  );
};

export default Heading;

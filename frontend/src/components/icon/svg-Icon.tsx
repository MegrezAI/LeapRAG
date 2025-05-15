import { cn } from '@/lib/utils';
import React from 'react';

interface SvgIconProps {
  name: string; //
  className?: string;
  width?: number | string;
  height?: number | string;
}

const SvgIcon: React.FC<SvgIconProps> = ({ name, className = '', width = 40, height = 40 }) => {
  return (
    <img
      src={`/assets/svg/${name}.svg`}
      alt={`${name} icon`}
      className={cn('!border-none', className)}
      width={width}
      height={height}
    />
  );
};

export default SvgIcon;

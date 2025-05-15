import { cn } from '@/lib/utils';
import React from 'react';

const ASPECT_RATIO = 180 / 64; // 原始图片的宽高比

const sizeMap = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 56
} as const;

type IconSize = keyof typeof sizeMap;

interface LeapRAGIconProps {
  className?: string;
  size?: IconSize;
}

export function LeapRAGIcon({ size = 'md', className }: LeapRAGIconProps) {
  const height = sizeMap[size];
  const width = Math.round(height * ASPECT_RATIO);

  return (
    <div className={cn('relative inline-block', className)} style={{ width, height }}>
      <img src="/logo.png" alt="LeapRAG logo" className="w-full h-full object-contain" />
    </div>
  );
}

export default LeapRAGIcon;

'use client';

import { type LLMProvider, IconMap } from '@/lib/constants/rag/llm';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ModelProviderIconProps {
  provider: LLMProvider;
  size?: number;
  className?: string;
}

export function ModelProviderIcon({ provider, size = 24, className }: ModelProviderIconProps) {
  const iconName = IconMap[provider];
  const iconSrc = `/assets/svg/llm/${iconName}.svg`;
  const [error, setError] = useState(false);

  return (
    <div className={cn('relative inline-block', className)} style={{ width: size, height: size }}>
      {error ? (
        <div className="w-full h-full rounded-full bg-gray-200" />
      ) : (
        <img
          src={iconSrc}
          alt={`${provider} icon`}
          className="w-full h-full object-contain"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}

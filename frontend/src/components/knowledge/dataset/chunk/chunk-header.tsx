'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ChunkHeaderProps {
  docName?: string;
}

export function ChunkHeader({ docName }: ChunkHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={() => router.back()}
        className="shrink-0"
      >
        <ArrowLeft className="h-4 w-4" />
      </Button>
      <div className="font-medium text-lg truncate flex-1">{docName}</div>
    </div>
  );
}

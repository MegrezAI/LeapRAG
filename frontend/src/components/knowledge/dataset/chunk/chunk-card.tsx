'use client';

import { Card, CardContent } from '@/components/ui/card';
import { type Chunk } from '@/types/chunk';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useState, useEffect } from 'react';
import { ChunkModal } from './chunk-modal';
import { Badge } from '@/components/ui/badge';
import { useTranslations } from 'next-intl';
import DOMPurify from 'dompurify';

interface ChunkItemProps {
  chunk: Chunk;
  isSelected?: boolean;
  onClick?: (chunk: Chunk) => void;
  onAvailableChange?: (chunk: Chunk, value: boolean) => void;
}

export default function ChunkCard({
  chunk,
  isSelected,
  onClick,
  onAvailableChange
}: ChunkItemProps) {
  const [isAvailable, setIsAvailable] = useState(chunk.available_int === 1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const t = useTranslations();

  useEffect(() => {
    setIsAvailable(chunk.available_int === 1);
  }, [chunk.available_int]);

  const handleAvailableChange = (checked: boolean) => {
    setIsAvailable(checked);
    onAvailableChange?.(chunk, checked);
  };

  const handleCheckboxChange = () => {
    onClick?.(chunk);
  };

  return (
    <>
      <Card
        className={cn(
          'p-4 hover:bg-accent/50 transition-colors cursor-pointer',
          isSelected && 'border-primary bg-accent'
        )}
        onClick={() => setIsModalOpen(true)}
      >
        <CardContent className="flex items-center justify-between gap-2 p-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={handleCheckboxChange}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex items-center gap-3">
            <Badge variant={chunk.mixed.length > 0 ? 'secondary' : 'outline'} className="h-5">
              {chunk.mixed.length > 0 ? t('Summary') : t('Raw Text')}
            </Badge>
            <span className="text-sm font-medium text-muted-foreground min-w-[24px]">
              {chunk.idx}
            </span>
          </div>
          <div
            className="ml-1 text-sm text-muted-foreground whitespace-pre-wrap break-words flex-1 [&>table]:border [&>table>thead>tr>th]:border [&>table>thead>tr>th]:p-2 [&>table>tbody>tr>td]:border  [&>table>tbody>tr>td]:p-2"
            dangerouslySetInnerHTML={{
              __html: DOMPurify.sanitize(
                chunk.content_with_weight.replace(/<em>(.*?)<\/em>/g, (match) => {
                  const keyword = match.replace(/<\/?em>/g, '');
                  return `<span class="bg-yellow-100 rounded-sm">${keyword}</span>`;
                })
              )
            }}
          />
          <div className="flex-shrink-0">
            <Switch
              checked={isAvailable}
              onCheckedChange={handleAvailableChange}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </CardContent>
      </Card>

      <ChunkModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        chunkId={chunk.id}
        docId={chunk.doc_id}
      />
    </>
  );
}

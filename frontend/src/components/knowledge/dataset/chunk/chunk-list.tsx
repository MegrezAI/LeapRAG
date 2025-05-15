'use client';

import { type Chunk } from '@/types/chunk';
import { PaginationWithLinks } from '@/components/ui/pagination-with-links';
import SpinLoader from '@/components/base/loader/spin-loader';
import EmptyState from '@/components/base/empty-state';
import { useInvalidateChunks, useUpdateChunkAvailable } from '@/lib/hooks/use-chunks';
import { toast } from 'sonner';
import ChunkCard from './chunk-card';
interface ChunkListProps {
  chunks: Chunk[];
  total: number;
  isLoading: boolean;
  page: number;
  pageSize: number;
  selectedChunks: string[];
  onSelectedChunksChange: (chunks: string[]) => void;
}

export default function ChunkList({
  chunks,
  total,
  isLoading,
  page,
  pageSize,
  selectedChunks,
  onSelectedChunksChange
}: ChunkListProps) {
  const invalidateChunks = useInvalidateChunks();

  const { mutate: updateChunkAvailable } = useUpdateChunkAvailable({
    onSuccess: () => {
      invalidateChunks();
      toast.success('Operation successfully');
    },
    onError: (error) => {
      toast.error('Operation failed');
    }
  });

  const onChunkSelect = (chunk: Chunk) => {
    const chunkId = chunk.id;
    if (selectedChunks.includes(chunkId)) {
      onSelectedChunksChange(selectedChunks.filter((id) => id !== chunkId));
    } else {
      onSelectedChunksChange([...selectedChunks, chunkId]);
    }
  };

  const onAvailableChange = (chunk: Chunk, available: boolean) => {
    updateChunkAvailable({
      chunk_ids: [chunk.id],
      available_int: available ? 1 : 0,
      doc_id: chunk.doc_id
    });
  };

  if (isLoading) {
    return <SpinLoader />;
  }
  if (chunks.length === 0) {
    return <EmptyState />;
  }

  const pagination = {
    page,
    pageSize,
    totalCount: total,
    pageSizeSelectOptions: {
      show: false
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto p-4 max-h-[calc(100vh-259px)]">
        <div className="space-y-2">
          {chunks.map((chunk) => (
            <ChunkCard
              key={chunk.id}
              chunk={chunk}
              isSelected={selectedChunks.includes(chunk.id)}
              onClick={onChunkSelect}
              onAvailableChange={onAvailableChange}
            />
          ))}
        </div>
      </div>

      {total > 0 && (
        <div className="p-4 border-t">
          <PaginationWithLinks {...pagination} />
        </div>
      )}
    </div>
  );
}

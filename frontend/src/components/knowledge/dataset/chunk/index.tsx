'use client';

import { useChunks, useInvalidateChunks } from '@/lib/hooks/use-chunks';
import { type Chunk } from '@/types/chunk';
import { useState } from 'react';

import { parseAsInteger, parseAsString, useQueryState } from 'nuqs';
import { PAGE_DEFAULT, PAGE_SIZE_DEFAULT } from '@/lib/constants/common';
import { useDebounceValue } from 'usehooks-ts';
import ChunkList from './chunk-list';
import { ChunkHeader } from './chunk-header';
import { ChunkToolbar } from './chunk-toolbar';
import { useDocument } from '@/lib/hooks/queries/use-document';

interface ChunkPageProps {
  docId: string;
}

export default function Chunk({ docId }: ChunkPageProps) {
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(PAGE_DEFAULT));
  const [keywords, setKeywords] = useQueryState('keywords', parseAsString.withDefault(''));
  const [pageSize] = useQueryState('page_size', parseAsInteger.withDefault(PAGE_SIZE_DEFAULT));
  const [availableInt, setAvailableInt] = useQueryState(
    'available_int',
    parseAsInteger.withDefault(-1)
  );
  const [debouncedKeywords] = useDebounceValue(keywords, 300);
  const [selectedChunks, setSelectedChunks] = useState<string[]>([]);
  const { data: docInfo } = useDocument(docId);

  const { chunks, total, isLoading } = useChunks({
    doc_id: docId,
    page,
    page_size: pageSize,
    keywords: debouncedKeywords,
    available_int: availableInt
  });

  const invalidateChunks = useInvalidateChunks();
  const handleKeywordsChange = (value: string) => {
    setKeywords(value);
    if (value && page !== PAGE_DEFAULT) {
      setPage(PAGE_DEFAULT);
    }
  };

  const handleBatchOperationSuccess = () => {
    setSelectedChunks([]);
    invalidateChunks();
  };

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedChunks([]);
    } else {
      const allChunkIds = chunks.map((chunk) => chunk.id);
      setSelectedChunks(allChunkIds);
    }
  };

  const isAllSelected = chunks.length > 0 && selectedChunks.length === chunks.length;

  return (
    <div className="flex flex-col h-full">
      <ChunkHeader docName={docInfo?.name} />
      <ChunkToolbar
        keywords={keywords}
        onSearch={handleKeywordsChange}
        onReset={() => {
          setKeywords('');
          setAvailableInt(-1);
        }}
        selectedChunks={selectedChunks}
        docId={docId}
        onBatchOperationSuccess={handleBatchOperationSuccess}
        onSelectAll={handleSelectAll}
        isAllSelected={isAllSelected}
        totalItems={chunks.length}
        availableInt={availableInt}
        onAvailableChange={setAvailableInt}
      />
      <ChunkList
        chunks={chunks}
        total={total}
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        selectedChunks={selectedChunks}
        onSelectedChunksChange={setSelectedChunks}
      />
    </div>
  );
}

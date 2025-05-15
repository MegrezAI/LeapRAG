'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import KnowledgeBaseCard from './knowledge-card';
import CreateKnowledgeModal from './create-knowledge-modal';
import { useInfiniteKnowledgeBases } from '@/lib/hooks/queries/use-knowledge';
import SpinLoader from '../base/loader/spin-loader';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { useInViewport } from 'ahooks';
import EmptyState from '../base/empty-state';

export default function KnowledgeBase() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const t = useTranslations();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [inView] = useInViewport(loadMoreRef);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteKnowledgeBases({});

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, fetchNextPage]);

  if (!data) return <></>;
  if (isLoading) return <SpinLoader />;

  return (
    <>
      <div className="sticky top-0 flex justify-end items-center pt-4 px-10 pb-2 leading-[56px] bg-background-body z-10">
        <Button size="sm" onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="size-4" />
          <span>{t('Create Knowledge Base')}</span>
        </Button>
      </div>

      {data.pages.flatMap((page) => page.data).length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title={t('No Knowledge Base')}
            subtitle={t('No knowledge base found, please create one first')}
          />
        </div>
      ) : (
        <div className="grid content-start grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 gap-4 px-10 pt-2 grow relative">
          {data.pages
            .flatMap((page) => page.data)
            .map((kb) => (
              <Link href={`/knowledge/${kb.id}`} key={kb.id}>
                <KnowledgeBaseCard {...kb} />
              </Link>
            ))}
        </div>
      )}
      <div ref={loadMoreRef} className="py-10">
        {isFetchingNextPage && <SpinLoader />}
      </div>
      <CreateKnowledgeModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </>
  );
}

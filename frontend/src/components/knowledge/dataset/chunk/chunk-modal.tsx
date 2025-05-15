'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useChunk } from '@/lib/hooks/use-chunks';
import SpinLoader from '@/components/base/loader/spin-loader';
import EmptyState from '@/components/base/empty-state';
import { useTranslations } from 'next-intl';
import { TreeView, type TreeDataItem } from '@/components/tree-view';
import { FileText } from 'lucide-react';
import DOMPurify from 'dompurify';
interface ChunkModalProps {
  isOpen: boolean;
  onClose: () => void;
  chunkId: string;
  docId: string;
}

export function ChunkModal({ isOpen, onClose, chunkId, docId }: ChunkModalProps) {
  const {
    chunk: originalChunk,
    isLoading,
    error
  } = useChunk({
    chunkId,
    docId,
    enabled: isOpen
  });
  const t = useTranslations();
  const [treeData, setTreeData] = useState<TreeDataItem[]>([]);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);

  const { chunk: selectedParagraphChunk, isLoading: isParagraphLoading } = useChunk({
    chunkId: selectedChunkId || '',
    docId,
    enabled: !!selectedChunkId
  });

  const chunk = originalChunk;
  useEffect(() => {
    if (chunk && chunk.mixed && isOpen) {
      setTreeData([
        {
          id: chunk.id,
          name: t('Summary Chunk'),
          icon: FileText,
          children: chunk.mixed.map((item) => ({
            id: item.id,
            name: `${t('Paragraph')} ${item.idx}`,
            icon: FileText,
            onClick: () => {
              setSelectedChunkId(item.id);
            }
          }))
        }
      ]);
    }
  }, [chunk, isOpen]);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Chunk Details')}</DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {isLoading ? (
              <SpinLoader />
            ) : chunk ? (
              <div className="space-y-6">
                <div className="grid gap-2">
                  <label className="text-sm font-semibold">{t('Content')}</label>
                  <div
                    className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap [&>table]:border [&>table>thead>tr>th]:border [&>table>thead>tr>th]:p-2 [&>table>tbody>tr>td]:border  [&>table>tbody>tr>td]:p-2"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(chunk.content_with_weight)
                    }}
                  />
                </div>

                {treeData && treeData.length > 0 && (
                  <div className="grid gap-2">
                    <label className="text-sm font-semibold">{t('Raw Text')}</label>
                    <div className="rounded-lg">
                      <TreeView
                        data={treeData}
                        defaultLeafIcon={FileText}
                        defaultNodeIcon={FileText}
                        expandAll
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState />
            )}
          </div>
        </DialogContent>
      </Dialog>
      {selectedChunkId && (
        <Dialog open={!!selectedChunkId} onOpenChange={() => setSelectedChunkId(null)}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('Raw Text')}</DialogTitle>
            </DialogHeader>
            <div className="mt-4">
              {selectedParagraphChunk && (
                <div className="p-4 rounded-lg bg-muted/50 whitespace-pre-wrap">
                  {selectedParagraphChunk.content_with_weight}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

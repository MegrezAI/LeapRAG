import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type ChunkRetrievalTestResponse, type Chunk } from '@/types/chunk';
import RetrievalChunkCard from './retrieval-chunk-card';
import { PaginationWithLinks } from '@/components/ui/pagination-with-links';
import SpinLoader from '@/components/base/loader/spin-loader';
import { MultiSelect } from '@/components/ui/multi-select';
import { useFormContext } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem } from '@/components/ui/form';
import React, { useEffect } from 'react';
import { type RetrievalConfigFormValues } from './retrieval-config';
import { useTranslations } from 'next-intl';

interface SearchResultsProps {
  isPending: boolean;
  data?: ChunkRetrievalTestResponse;
  page: number;
  pageSize: number;
}

export const RetrievalResults = ({ isPending, data, page, pageSize }: SearchResultsProps) => {
  const form = useFormContext<RetrievalConfigFormValues>();
  const t = useTranslations();
  const docOptions =
    data?.doc_aggs.map((doc) => ({
      label: doc.doc_name,
      value: doc.doc_id
    })) || [];

  if (isPending) {
    return (
      <Card className="p-4 h-full">
        <CardContent className="space-y-4 h-full">
          <SpinLoader />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="p-4 h-full flex items-center justify-center">
        <div className="text-muted-foreground py-12">{t('Run retrieval test to see results')}</div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col mb-4">
        <h2 className="text-lg font-medium">{t('Retrieval Results')}</h2>
        <span className="text-sm font-medium">
          ({data.total}
          {t('Retrieved Paragraphs')})
        </span>
      </div>

      <div className="p-2">
        <FormField
          control={form.control}
          name="doc_ids"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <MultiSelect
                  options={docOptions}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={isPending}
                  maxCount={5}
                  showAllCheckbox={false}
                />
              </FormControl>
            </FormItem>
          )}
        />
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        {data.labels?.map((label, index) => (
          <Badge key={index} variant="outline">
            {label}
          </Badge>
        ))}
      </div>

      <CardContent className="p-2 space-y-4 h-[calc(100vh-390px)] overflow-y-auto">
        {data.chunks?.map((chunk) => (
          <RetrievalChunkCard key={chunk.chunk_id} chunk={chunk} doc_aggs={data.doc_aggs} />
        ))}
      </CardContent>

      {data.total > 0 && (
        <div className="mt-4 pt-4 border-t">
          <PaginationWithLinks
            page={page}
            pageSize={pageSize}
            totalCount={data.total}
            pageSizeSelectOptions={{
              show: false
            }}
          />
        </div>
      )}
    </Card>
  );
};

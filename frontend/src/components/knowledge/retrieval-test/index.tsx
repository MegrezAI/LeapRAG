'use client';
import PageHeader from '@/components/base/page-header';
import { useTranslations } from 'next-intl';
import React, { useEffect, useRef } from 'react';
import { useRetrievalTest } from '@/lib/hooks/use-chunks';
import { chunkRetrievalTestSchema } from '@/lib/schema/knowledge/chunk';
import { parseAsInteger } from 'nuqs';
import { useQueryState } from 'nuqs';
import { PAGE_DEFAULT, PAGE_SIZE_DEFAULT } from '@/lib/constants/common';
import RetrievalConfig from './retrieval-config';
import { RetrievalResults } from './retrieval-results';
import { useForm, FormProvider } from 'react-hook-form';
import { type z } from 'zod';

import { zodResolver } from '@hookform/resolvers/zod';

interface RetrievalTestProps {
  kbId: string;
}

const formSchema = chunkRetrievalTestSchema.omit({
  kb_ids: true,
  page: true,
  page_size: true
});

type FormValues = z.infer<typeof formSchema>;

const RetrievalTest = ({ kbId }: RetrievalTestProps) => {
  const t = useTranslations();
  const { mutate, isPending, data } = useRetrievalTest();
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      doc_ids: [],
      question: '',
      similarity_threshold: 0.2,
      vector_similarity_weight: 0.3,
      use_kg: false,
      highlight: true
    }
  });
  const selectedDocs = form.watch('doc_ids') || [];
  const prevDocs = useRef<string[]>([]);

  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(PAGE_DEFAULT));
  const [pageSize, setPageSize] = useQueryState(
    'page_size',
    parseAsInteger.withDefault(PAGE_SIZE_DEFAULT)
  );

  const handleConfigSubmit = (values: FormValues) => {
    setPage(PAGE_DEFAULT);
    mutate({
      ...values,
      page: PAGE_DEFAULT,
      page_size: pageSize,
      kb_ids: [kbId]
    });
  };

  useEffect(() => {
    if (data) {
      const values = form.getValues();
      mutate({
        ...values,
        page,
        page_size: pageSize,
        kb_ids: [kbId]
      });
    }
  }, [page]);

  const shouldSubmit = () => {
    // 只有在 doc_ids 发生变化时触发提交
    return (
      (selectedDocs.length === 0 && prevDocs.current?.length > 0) ||
      (selectedDocs.length > 0 && prevDocs.current?.length === 0)
    );
  };

  useEffect(() => {
    if (shouldSubmit()) {
      form.handleSubmit(handleConfigSubmit)();
    }

    prevDocs.current = selectedDocs;
  }, [selectedDocs]);

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(handleConfigSubmit)} className="h-full">
        <div className="flex flex-col h-full">
          <PageHeader title={t('Retrieval Test')} />
          <div className="p-4 grid grid-cols-1 lg:grid-cols-4 gap-4 h-full">
            <div className="lg:col-span-1 space-y-4">
              <div>
                <h2 className="text-lg font-medium mb-4">{t('Retrieval Test Configuration')}</h2>
                <RetrievalConfig isPending={isPending} />
              </div>
            </div>

            <div className="flex flex-col space-y-4 lg:col-span-3 h-full">
              <RetrievalResults isPending={isPending} data={data} page={page} pageSize={pageSize} />
            </div>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default RetrievalTest;

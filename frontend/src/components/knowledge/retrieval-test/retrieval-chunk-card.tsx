import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type DocAgg, type Chunk } from '@/types/chunk';
import { Separator } from '@/components/ui/separator';
import SvgIcon from '@/components/icon/svg-Icon';
import { getExtension } from '@/lib/utils/document';
import DOMPurify from 'dompurify';
import { useTranslations } from 'next-intl';

interface ChunkCardProps {
  chunk: Chunk;
  doc_aggs: DocAgg[];
}

const RetrievalChunkCard = ({ chunk, doc_aggs }: ChunkCardProps) => {
  const doc_agg = doc_aggs?.find((agg) => agg.doc_id === chunk.doc_id);
  const t = useTranslations();

  return (
    <Card className="p-3">
      <div className="flex flex-wrap gap-2 mb-2">
        <Badge variant="secondary">
          {t('Similarity')}: {chunk.similarity?.toFixed(4) || 'N/A'}
        </Badge>
        <Badge variant="secondary">
          {t('Vector Similarity')}: {chunk.vector_similarity?.toFixed(4) || 'N/A'}
        </Badge>
        <Badge variant="secondary">
          {t('Term Similarity')}: {chunk.term_similarity?.toFixed(4) || 'N/A'}
        </Badge>
      </div>
      <div
        className="whitespace-pre-wrap text-sm"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(
            chunk.highlight?.match(/<em>(.*?)<\/em>/g)?.reduce((content, match) => {
              const keyword = match.replace(/<\/?em>/g, '');
              return content.replace(
                new RegExp(keyword, 'g'),
                `<span class="bg-yellow-100 rounded-sm">${keyword}</span>`
              );
            }, chunk.content_with_weight) || chunk.content_with_weight
          )
        }}
      />
      <div className="flex items-center gap-2 border-t pt-2 mt-2 ">
        <SvgIcon name={`file-icon/${getExtension(doc_agg?.doc_name || '')}`} width={18} />
        <span className="text-xs text-muted-foreground">{doc_agg?.doc_name}</span>
      </div>
    </Card>
  );
};

export default RetrievalChunkCard;

import Chunk from '@/components/knowledge/dataset/chunk';

export default async function KnowledgeBaseDatasetDetailPage({
  params
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = await params;

  return <Chunk docId={docId} />;
}

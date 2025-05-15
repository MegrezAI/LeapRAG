import { KnowledgeSidebar } from '@/components/knowledge/knowledge-sidebar';
import { DetailLayout } from '@/components/base/detail-layout';

export default async function KnowledgeLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ kbId: string }>;
}) {
  const { kbId } = await params;
  return (
    <DetailLayout
      sidebar={<KnowledgeSidebar kbId={kbId} collapsible="icon" />}
      className="flex w-full h-full"
    >
      {children}
    </DetailLayout>
  );
}

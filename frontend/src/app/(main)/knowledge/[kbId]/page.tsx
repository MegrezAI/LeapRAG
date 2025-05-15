import { redirect } from 'next/navigation';

export default async function KnowledgeEditPage({ params }: { params: Promise<{ kbId: string }> }) {
  const { kbId } = await params;
  redirect(`/knowledge/${kbId}/dataset`);
}

import { AgentSidebar } from '@/components/agent/agent-sidebar';
import { DetailLayout } from '@/components/base/detail-layout';

export default async function AgentLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ agentId: string }>;
}) {
  const { agentId } = await params;
  return (
    <DetailLayout sidebar={<AgentSidebar agentId={agentId} collapsible="icon" />}>
      {children}
    </DetailLayout>
  );
}

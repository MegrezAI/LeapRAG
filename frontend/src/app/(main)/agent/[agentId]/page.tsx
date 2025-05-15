import { redirect } from 'next/navigation';

interface AgentPageProps {
  params: Promise<{ agentId: string }>;
}

const AgentPage = async ({ params }: AgentPageProps) => {
  const { agentId } = await params;
  redirect(`/agent/${agentId}/agent-configuration`);
};

export default AgentPage;

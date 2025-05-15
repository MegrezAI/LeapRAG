'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '../ui/badge';
import { useAgent } from '@/lib/hooks/queries/use-agent';
import { AgentStatus } from '@/lib/constants/agent';
import { SidebarHeader } from '@/components/base/detail-layout/sidebar-header';
import { Bot } from 'lucide-react';

interface AgentInfoProps {
  agentId: string;
}

export default function AgentInfo({ agentId }: AgentInfoProps) {
  const t = useTranslations();
  const { data: agent } = useAgent(agentId);

  if (!agent) return null;

  return (
    <>
      <SidebarHeader
        title={agent.name}
        icon={
          <div className="size-8">
            {agent.icon ? (
              <img
                src={agent.icon}
                alt={agent.name}
                className="size-full rounded-md object-cover"
              />
            ) : (
              <Bot className="size-full" />
            )}
          </div>
        }
        badge={
          <div className="flex gap-2">
            <Badge variant={agent.status === AgentStatus.Active ? 'success' : 'secondary'}>
              {t(agent.status.charAt(0).toUpperCase() + agent.status.slice(1))}
            </Badge>
          </div>
        }
      />
    </>
  );
}

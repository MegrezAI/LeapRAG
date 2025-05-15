'use client';
import AgentCard from '@/components/agents/agent-card';
import CreateAgentModal from '@/components/agents/create-agent-modal';
import { useAgents } from '@/lib/hooks/queries/use-agent';

import React from 'react';
import SpinLoader from '../base/loader/spin-loader';
import Link from 'next/link';
import EmptyState from '../base/empty-state';
import { useTranslations } from 'next-intl';

const Agents = () => {
  const { data: agents, isLoading } = useAgents();
  const t = useTranslations();

  if (isLoading) return <SpinLoader />;
  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end items-center pt-4 px-10 pb-2 leading-[56px] bg-background-body">
        <CreateAgentModal />
      </div>

      {agents?.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title={t('No Agents')}
            subtitle={t('No agents found, please create one first')}
          />
        </div>
      ) : (
        <div className="grid content-start grid-cols-1 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5 2k:grid-cols-6 gap-4 px-10 pt-2 grow relative">
          {agents?.map((agent) => (
            <Link href={`/agent/${agent.id}`} key={agent.id}>
              <AgentCard key={agent.id} {...agent} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Agents;

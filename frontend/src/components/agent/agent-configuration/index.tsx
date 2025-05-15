'use client';

import React, { useEffect, useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import SpinLoader from '@/components/base/loader/spin-loader';
import { useAgent, useSetAgentQueryData, useUpdateAgent } from '@/lib/hooks/queries/use-agent';

import {
  type AgentUpdateSchema,
  agentUpdateSchema,
  type AgentCreateSchema
} from '@/lib/schema/agent';
import { Label } from '@/components/ui/label';
import { z } from 'zod';
import PageHeader from '@/components/base/page-header';
import { useKnowledgeBases } from '@/lib/hooks/queries/use-knowledge';
import { DialogConfig } from './agent-settings/dialog-config';
import { GeneralSettings } from './agent-settings/general-settings';
import { SkillSettings } from './agent-settings/skill-settings';

type Skill = NonNullable<AgentCreateSchema['skills']>[number];

interface AgentConfigProps {
  agentId: string;
}

export interface AgentConfigFormValues extends AgentUpdateSchema {
  local_url?: string;
}

const agentConfigSchema = agentUpdateSchema;

const AgentConfig = ({ agentId }: AgentConfigProps) => {
  const t = useTranslations();
  const { data: agent, isLoading } = useAgent(agentId);
  const setAgentQueryData = useSetAgentQueryData();
  const { data: knowledgeData } = useKnowledgeBases({});
  const knowledgeBases = knowledgeData?.data || [];

  const form = useForm<AgentConfigFormValues>({
    resolver: zodResolver(agentConfigSchema),
    defaultValues: {
      name: '',
      description: '',
      icon: '🤖',
      version: '1.0.0',
      url: '',
      documentation_url: '',
      agent_config: {
        dialog_id: '',
        dialog_config: {
          kb_ids: [],
          name: '',
          description: '',
          icon: '',
          id: '',
          top_n: 6,
          similarity_threshold: 0.1,
          vector_similarity_weight: 0.3,
          llm_id: '',
          rerank_id: '',
          llm_setting: {
            temperature: 0.7,
            top_p: 1,
            presence_penalty: 0,
            frequency_penalty: 0,
            max_tokens: 2000
          },
          prompt_config: {
            empty_response: '',
            prologue: t('Assistant Prologue'),
            quote: true,
            keyword: false,
            tts: false,
            system: t.raw('Assistant System Prompt'),
            refine_multiturn: true,
            use_kg: false,
            parameters: []
          }
        }
      },
      authentication: {
        schemes: [],
        credentials: null
      },
      provider: {
        organization: '',
        url: null
      },
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: false
      },
      skills: [],
      local_url: ''
    }
  });

  const { mutateAsync: updateAgent, isPending } = useUpdateAgent({
    onSuccess: (response, variables) => {
      setAgentQueryData(agentId, (oldData) => {
        if (!oldData) return response;
        return {
          ...oldData,
          ...variables.data
        };
      });
      toast.success(t('Updated Successfully'));
    },
    onError: () => {
      toast.error(t('Update Failed'));
    }
  });

  useEffect(() => {
    if (agent) {
      form.reset(agent);
    }
  }, [agent, agentId]);

  if (isLoading) return <SpinLoader />;

  const onSubmit = async (data: AgentConfigFormValues) => {
    try {
      const submitData = { ...data };
      delete submitData.local_url;
      await updateAgent({
        id: agentId,
        data: submitData
      });
    } catch (error) {
      console.error('Failed to update agent config:', error);
    }
  };

  return (
    <div>
      <PageHeader title={t('Configuration')} />
      <div className="w-full sm:max-w-2xl p-4">
        <FormProvider {...form}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              {/* General Settings */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium">{t('Agent Card Settings')}</h3>
                <GeneralSettings />
              </div>

              {/* Skills */}
              {/* <div className="space-y-6">
                <h3 className="text-lg font-medium">{t('Skills')}</h3>
                <SkillSettings isPending={isPending} />
              </div> */}

              {/* Agent Configuration */}
              <div className="space-y-6">
                <h3 className="text-lg font-medium">{t('Agent Core Settings')}</h3>
                <DialogConfig isPending={isPending} knowledgeBases={knowledgeBases} />
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={isPending} loading={isPending}>
                  {t('Update')}
                </Button>
              </div>
            </form>
          </Form>
        </FormProvider>
      </div>
    </div>
  );
};

export default AgentConfig;

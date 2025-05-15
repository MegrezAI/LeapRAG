'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import SpinLoader from '@/components/base/loader/spin-loader';
import { useAgent } from '@/lib/hooks/queries/use-agent';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Copy, Check, X, LinkIcon } from 'lucide-react';
import copy from 'copy-to-clipboard';
import PageHeader from '../../base/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '../../ui/input';
import Link from 'next/link';
import { Tooltip } from '@/components/base/tooltip';

interface AgentConfigProps {
  agentId: string;
}

const AgentConfig = ({ agentId }: AgentConfigProps) => {
  const t = useTranslations();
  const { data: agent, isLoading } = useAgent(agentId);

  const handleCopy = (text: string | undefined) => {
    if (text) {
      copy(text);
      toast.success(t('Copied to clipboard successfully'));
    }
  };

  if (isLoading) return <SpinLoader />;

  return (
    <div>
      <PageHeader title={t('Agent Card')} />
      <div className="w-full p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 基本信息卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Basic Information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="agent-name">{t('Agent Name')}</Label>
                <div id="agent-name" className="text-sm">
                  {agent?.name || ''}
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="agent-description">{t('Agent Description')}</Label>
                <div id="agent-description" className="text-sm text-muted-foreground">
                  {agent?.description || ''}
                </div>
              </div>

              <div className="flex flex-col space-y-2">
                <Label htmlFor="agent-version">{t('Version')}</Label>
                <div id="agent-version" className="flex items-center">
                  <Badge variant="outline" className="text-xs">
                    {agent?.version}
                  </Badge>
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="agent-url" className="flex items-center">
                  {t('Customized Agent URL')}
                  <Tooltip
                    content={t(
                      'When the value is empty, the local agent URL will be used as the agent service address, For customization, please fill in the service address after Nginx reverse proxy to override'
                    )}
                    withIcon
                  />
                </Label>
                <div id="agent-url" className="flex items-center gap-2">
                  {agent?.url ? (
                    <>
                      <Input className="truncate" value={agent.url} disabled />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleCopy(agent.url)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="agent-documentation-url">{t('Documentation URL')}</Label>
                <div id="agent-documentation-url" className="flex items-center gap-2">
                  {agent?.documentation_url ? (
                    <>
                      <Input className="truncate" value={agent.documentation_url} disabled />
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Link href={agent.documentation_url} target="_blank">
                          <LinkIcon className="h-4 w-4" />
                        </Link>
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm text-muted-foreground">-</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Provider 卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Provider')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <Label htmlFor="organization">{t('Organization')}</Label>
                <div id="organization" className="text-sm">
                  {agent?.provider?.organization || '-'}
                </div>
              </div>
              <div className="flex flex-col space-y-2">
                <Label htmlFor="provider-url">{t('Provider URL')}</Label>
                <div id="provider-url" className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded text-sm inline-block truncate">
                    {agent?.provider?.url || '-'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 认证配置卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Authentication')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {agent?.authentication?.schemes?.length ? (
                  agent.authentication.schemes.map((scheme) => (
                    <Badge key={scheme} variant="secondary" className="capitalize">
                      {scheme}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Capabilities 卡片 */}
          <Card>
            <CardHeader>
              <CardTitle>{t('Capabilities')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card
                  className={`border shadow-sm ${agent?.capabilities?.streaming ? 'border-green-200 bg-green-50/30 dark:bg-green-900/10' : 'border-muted bg-muted/10'}`}
                >
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm">{t('Streaming')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="mt-2 flex items-center">
                      <span
                        className={`w-2 h-2 rounded-full mr-2 ${agent?.capabilities?.streaming ? 'bg-green-500' : 'bg-gray-300'}`}
                      ></span>
                      <span className="text-xs font-medium">
                        {agent?.capabilities?.streaming ? t('Active') : t('Inactive')}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card
                  className={`border shadow-sm ${agent?.capabilities?.pushNotifications ? 'border-green-200 bg-green-50/30 dark:bg-green-900/10' : 'border-muted bg-muted/10'}`}
                >
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm">{t('Push Notifications')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="mt-2 flex items-center">
                      <span
                        className={`w-2 h-2 rounded-full mr-2 ${agent?.capabilities?.pushNotifications ? 'bg-green-500' : 'bg-gray-300'}`}
                      ></span>
                      <span className="text-xs font-medium">
                        {agent?.capabilities?.pushNotifications ? t('Active') : t('Inactive')}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* <Card
                  className={`border shadow-sm ${agent?.capabilities?.stateTransitionHistory ? 'border-green-200 bg-green-50/30 dark:bg-green-900/10' : 'border-muted bg-muted/10'}`}
                >
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-sm">{t('State Transition History')}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-1">
                    <div className="mt-2 flex items-center">
                      <span
                        className={`w-2 h-2 rounded-full mr-2 ${agent?.capabilities?.stateTransitionHistory ? 'bg-green-500' : 'bg-gray-300'}`}
                      ></span>
                      <span className="text-xs font-medium">
                        {agent?.capabilities?.stateTransitionHistory ? t('Active') : t('Inactive')}
                      </span>
                    </div>
                  </CardContent>
                </Card> */}
              </div>
            </CardContent>
          </Card>

          {/* Skills 卡片 */}
          {agent?.skills && agent.skills.length > 0 && (
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>{t('Skills')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {agent.skills.map((skill) => (
                    <Card key={skill.id} className="border shadow-sm">
                      <CardHeader className="p-3 pb-1">
                        <CardTitle className="text-sm">{skill.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 pt-1">
                        <p className="text-sm text-muted-foreground">{skill.description}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AgentConfig;

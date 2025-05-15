'use client';

import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, LinkIcon, InfoIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { MultiSelect } from '@/components/ui/multi-select';
import { toast } from 'sonner';
import copy from 'copy-to-clipboard';
import { type AgentConfigFormValues } from '..';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';
import { EmojiPicker } from '@/components/base/emoji-picker';
import { Tooltip } from '@/components/base/tooltip';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Upload } from 'lucide-react';
import { transformFile2Base64 } from '@/lib/utils/file';

export function GeneralSettings() {
  const { control, getValues } = useFormContext<AgentConfigFormValues>();
  const t = useTranslations();

  const handleCopy = (text: string | undefined) => {
    if (text) {
      copy(text);
      toast.success(t('Copied to clipboard successfully'));
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Agent Name')}</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="icon"
          render={({ field: { onChange, value, ...field } }) => (
            <FormItem>
              <FormLabel>{t('Agent Image')}</FormLabel>
              <div className="w-fit">
                <label htmlFor="agent-icon-upload" className="cursor-pointer">
                  <Avatar className="size-24 rounded-md">
                    {value ? (
                      <AvatarImage src={value} alt={getValues('name')} />
                    ) : (
                      <AvatarFallback className="rounded-sm">
                        <Upload className="size-4" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                </label>
              </div>
              <FormControl>
                <Input
                  id="agent-icon-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const base64 = await transformFile2Base64(file);
                      onChange(base64);
                    }
                  }}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Description')}</FormLabel>
              <FormControl>
                <Textarea className="min-h-[100px]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="version"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Version')}</FormLabel>
              <FormControl>
                <Input {...field} placeholder="1.0.0" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="local_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Local Agent URL')}</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input {...field} type="url" disabled={true} />
                </FormControl>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="size-4"
                  onClick={() => handleCopy(field.value)}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="url"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">
                {t('Customized Agent URL')}
                <Tooltip
                  content={t(
                    'When the value is empty, the local agent URL will be used as the agent service address, For customization, please fill in the service address after Nginx reverse proxy to override'
                  )}
                  withIcon
                />
              </FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input {...field} type="url" placeholder="https://" />
                </FormControl>
                <Button
                  variant="ghost"
                  size="icon"
                  type="button"
                  className="size-4"
                  disabled={!field.value}
                  onClick={() => handleCopy(field.value)}
                >
                  <Copy className="size-4" />
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="documentation_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('Documentation URL')}</FormLabel>
              <div className="flex items-center gap-2">
                <FormControl>
                  <Input {...field} type="url" placeholder="https://" />
                </FormControl>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  type="button"
                  disabled={!field.value || !/^https?:\/\/.+/.test(field.value)}
                >
                  <Link href={field.value || '#'} target="_blank">
                    <LinkIcon className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Provider */}
      <div className="space-y-6">
        <div className="space-y-4">
          <FormField
            control={control}
            name="provider.organization"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t('Organization')}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="provider.url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t('Provider URL')}{' '}
                  <span className="text-muted-foreground">({t('Optional')})</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} type="url" placeholder="https://" value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </div>

      {/* auth */}
      <div className="space-y-4">
        <FormField
          control={control}
          name="authentication.schemes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center">{t('Authentication')}</FormLabel>
              <FormControl>
                <MultiSelect
                  options={[
                    { label: 'Bearer', value: 'bearer' },
                    { label: 'API Key', value: 'apiKey' }
                  ]}
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  showClear={false}
                  showClose={false}
                  showSearch={false}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Capabilities */}
      <div className="space-y-6">
        <div className="space-y-4">
          <Label>{t('Capabilities')}</Label>
          <FormField
            control={control}
            name="capabilities.streaming"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>{t('Streaming')}</FormLabel>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="capabilities.pushNotifications"
            render={({ field }) => (
              <FormItem className="flex flex-col rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <FormLabel>{t('Push Notifications')}</FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </div>
                {field.value && (
                  <div className="mt-4 pt-4">
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <FormLabel>{t('JWKS Public Endpoint')}</FormLabel>
                        <Tooltip
                          content={t(
                            'JSON Web Key Set endpoint used for push notification authentication'
                          )}
                          withIcon
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input
                            type="url"
                            disabled={true}
                            value={`${getValues('url')}/.well-known/jwks.json`}
                          />
                        </FormControl>
                        <Button
                          variant="ghost"
                          size="icon"
                          type="button"
                          className="size-4"
                          onClick={() => handleCopy(`${getValues('url')}/.well-known/jwks.json`)}
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </FormItem>
            )}
          />
          {/* <FormField
            control={control}
            name="capabilities.stateTransitionHistory"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel>{t('State Transition History')}</FormLabel>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          /> */}
        </div>
      </div>
    </div>
  );
}

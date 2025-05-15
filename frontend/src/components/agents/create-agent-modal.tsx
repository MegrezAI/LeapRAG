'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { useCreateAgent } from '@/lib/hooks/queries/use-agent';
import { useUpdateAgent } from '@/lib/hooks/queries/use-agent';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { EmojiPicker } from '@/components/base/emoji-picker';
import { type AgentCreateSchema, agentCreateSchema } from '@/lib/schema/agent';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

import { Label } from '../ui/label';
import SkillFormModal from './skill-form-modal';
import { MultiSelect } from '@/components/ui/multi-select';
import { useKnowledgeBases } from '@/lib/hooks/queries/use-knowledge';

export default function CreateAgentModal() {
  const [open, setOpen] = useState(false);
  const [skillModalOpen, setSkillModalOpen] = useState(false);

  const [editingSkill, setEditingSkill] = useState<
    NonNullable<AgentCreateSchema['skills']>[number] | undefined
  >();
  const t = useTranslations();
  const router = useRouter();
  const { data: knowledge } = useKnowledgeBases({});
  const { mutate: updateAgent } = useUpdateAgent({});

  const { mutate: create, isPending } = useCreateAgent({
    onSuccess: (data) => {
      setOpen(false);
      form.reset();
      toast.success(t('Created Successfully'));
      router.push(`/agent/${data.id}`);
    }
  });

  const form = useForm<AgentCreateSchema>({
    resolver: zodResolver(agentCreateSchema),
    defaultValues: {
      name: '',
      description: '',
      type: '',
      icon: '',
      version: '1.0.0',
      url: '',
      documentation_url: '',
      agent_config: {
        dialog_config: {
          kb_ids: []
        }
      },
      authentication: {},
      provider: {
        organization: '',
        url: ''
      },
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: false
      },
      skills: []
    }
  });

  useEffect(() => {
    if (open) {
      form.reset();
      if (fields.length) {
        remove();
      }
    }
  }, [open, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'skills',
    shouldUnregister: true
  });

  const onSubmit = (values: AgentCreateSchema) => {
    const submitData = {
      ...values,
      agent_config: {
        dialog_config: {
          kb_ids: values.agent_config?.dialog_config?.kb_ids || []
        }
      }
    } as AgentCreateSchema;
    create(submitData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          <span>{t('Create Agent')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent size="xl" className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">{t('Create Agent')}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-6">
              {/* Agent Name */}
              <div>
                <FormLabel>{t('Agent Name')}</FormLabel>
                <div className="flex items-center gap-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="flex-1">
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Description')}</FormLabel>
                    <FormControl>
                      <Textarea {...field} className="min-h-[100px]" value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Version & URL */}

              <FormField
                control={form.control}
                name="version"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Version')}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="documentation_url"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Documentation URL')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="url"
                        placeholder="https://"
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Agent Configuration */}
            <div className="space-y-6">
              <FormField
                control={form.control}
                name="agent_config.dialog_config.kb_ids"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Knowledge')}</FormLabel>
                    <FormControl>
                      <MultiSelect
                        options={
                          knowledge?.data?.map((dialog) => ({
                            label: dialog.name,
                            value: dialog.id
                          })) || []
                        }
                        onValueChange={field.onChange}
                        defaultValue={field.value || []}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Provider */}
            <div className="space-y-6">
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="provider.organization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Organization')}</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="provider.url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('Provider URL')}</FormLabel>
                      <FormControl>
                        <Input {...field} type="url" value={field.value ?? ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Capabilities */}
            <div className="space-y-6">
              <div className="space-y-4">
                <Label>{t('Capabilities')}</Label>
                <FormField
                  control={form.control}
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
                  control={form.control}
                  name="capabilities.pushNotifications"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>{t('Push Notifications')}</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {/* <FormField
                  control={form.control}
                  name="capabilities.stateTransitionHistory"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>{t('State Transition History')}</FormLabel>
                      </div>
                      <FormControl>
                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                /> */}
              </div>
            </div>

            {/* Skills */}
            {/* <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label>{t('Skills')}</Label>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setSkillModalOpen(true)}
                >
                  <Plus />
                </Button>
              </div>
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <Card
                    key={field.id}
                    className="relative group cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => {
                      setSkillModalOpen(true);
                      setEditingSkill(field);
                    }}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(index);
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                    <CardHeader>
                      <div className="font-medium">{field.name}</div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div> */}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                }}
              >
                {t('Cancel')}
              </Button>
              <Button type="submit" disabled={isPending}>
                {t('Create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>

      <SkillFormModal
        open={skillModalOpen}
        onOpenChange={setSkillModalOpen}
        onSubmit={(skill) => {
          if (editingSkill) {
            const index = fields.findIndex((f) => f.id === editingSkill.id);
            if (index !== -1) {
              remove(index);
              append(skill);
            }
          } else {
            append(skill);
          }
          setEditingSkill(undefined);
        }}
        initialData={editingSkill}
      />
    </Dialog>
  );
}

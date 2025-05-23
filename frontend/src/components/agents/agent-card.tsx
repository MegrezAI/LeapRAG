import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Trash2, Pencil, XCircle, CheckCircle, Bot } from 'lucide-react';
import useISOTime from '@/lib/hooks/use-iso-time';
import { useDeleteAgent, useInvalidateAgents, useUpdateAgent } from '@/lib/hooks/queries/use-agent';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { DropdownMenuButton, type MenuItemProps } from '@/components/base/dropdown-menu-button';
import { useState } from 'react';
import { ConfirmModal } from '../base/confirm-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { agentBaseInfoSchema, type AgentBaseInfoSchema } from '@/lib/schema/agent';
import { EmojiPicker } from '@/components/base/emoji-picker';
import { cn } from '@/lib/utils';
import { AgentStatus } from '@/lib/constants/agent';

interface AgentCardProps {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  type: string;
  icon?: string;
  status: string;
}

export default function AgentCard({
  id,
  name,
  description,
  created_at,
  type,
  icon,
  status
}: AgentCardProps) {
  const { formatISOString } = useISOTime();
  const t = useTranslations();
  const invalidateAgents = useInvalidateAgents();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { mutate: deleteAgent, isPending: isDeleting } = useDeleteAgent({
    onSuccess: () => {
      toast.success(t('Deleted Successfully'));
      invalidateAgents();
    },
    onError: () => {}
  });

  const { mutateAsync: updateAgent, isPending: isUpdating } = useUpdateAgent({
    onSuccess: () => {
      invalidateAgents();
      setIsEditModalOpen(false);
    },
    onError: () => {}
  });

  const form = useForm<AgentBaseInfoSchema>({
    resolver: zodResolver(agentBaseInfoSchema),
    defaultValues: {
      name: name,
      description: description || '',
      icon: icon || '🤖'
    }
  });

  const handleDelete = () => {
    if (isDeleting) return;
    deleteAgent(id);
  };

  const handleEdit = async (formData: AgentBaseInfoSchema) => {
    try {
      await updateAgent({ id, data: formData });
      toast.success(t('Updated Successfully'));
    } catch (error) {}
  };

  const handleToggleStatus = async () => {
    try {
      const newStatus = status === AgentStatus.Active ? AgentStatus.Inactive : AgentStatus.Active;
      await updateAgent({ id, data: { status: newStatus } });
      toast.success(
        t(newStatus === AgentStatus.Active ? 'Enabled Successfully' : 'Disabled Successfully')
      );
    } catch (error) {}
  };

  const menuItems: MenuItemProps[] = [
    // {
    //   label: t('Edit'),
    //   icon: <Pencil className="size-4" />,
    //   onClick: () => setIsEditModalOpen(true)
    // },
    {
      label: status === AgentStatus.Active ? t('Disable') : t('Enable'),
      icon:
        status === AgentStatus.Active ? (
          <XCircle className="size-4" />
        ) : (
          <CheckCircle className="size-4" />
        ),
      onClick: handleToggleStatus
    },
    {
      label: t('Delete'),
      icon: <Trash2 className="size-4" />,
      onClick: () => setShowDeleteAlert(true),
      className: 'text-destructive'
    }
  ];

  return (
    <>
      <Card className="flex flex-col cursor-pointer hover:shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center space-x-2 flex-1 min-w-0">
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg flex-shrink-0">
              {icon ? (
                <img src={icon} alt={name} className="size-full rounded-md object-cover" />
              ) : (
                <Bot className="size-full" />
              )}
            </div>
            <p className="text-lg font-medium whitespace-nowrap overflow-hidden text-ellipsis">
              {name}
            </p>
          </div>
          <DropdownMenuButton items={menuItems} buttonProps={{ size: 'icon' }} />
        </CardHeader>
        <CardContent className="min-h-[4rem]">
          <p className="text-sm text-muted-foreground truncate">{description ?? ''}</p>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <Badge variant={status === AgentStatus.Active ? 'success' : 'secondary'}>
            {t(status.charAt(0).toUpperCase() + status.slice(1))}
          </Badge>
          <div className="flex items-center gap-1">
            <Clock className="size-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{formatISOString(created_at)}</span>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('Agent Information')}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEdit)} className="space-y-4">
              <FormField
                control={form.control}
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
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('Agent Icon')}</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-4">
                        <EmojiPicker
                          onSelect={(emoji) => {
                            field.onChange(emoji);
                          }}
                          defaultEmoji={field.value || '🤖'}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
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

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)}>
                  {t('Cancel')}
                </Button>
                <Button type="submit" disabled={isUpdating} loading={isUpdating}>
                  {t('Save')}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isShow={showDeleteAlert}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteAlert(false)}
        title={t('Delete Agent')}
        description={t('Are you sure you want to delete this agent?')}
        showConfirm
        showCancel
        type="destructive"
      />
    </>
  );
}

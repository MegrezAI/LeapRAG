'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Book, Trash2 } from 'lucide-react';
import { type KnowledgeBase } from '@/types/rag/knowledge';
import { formatDate } from '@/lib/utils/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteKnowledgeBaseApi } from '@/api/rag/knowledge';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { DropdownMenuButton, type MenuItemProps } from '@/components/base/dropdown-menu-button';
import { useState } from 'react';

import { ConfirmModal } from '../base/confirm-modal';
import useISOTime from '@/lib/hooks/use-iso-time';
import Link from 'next/link';
import { useInvalidateKnowledgeBases } from '@/lib/hooks/queries/use-knowledge';

export default function KnowledgeBaseCard({
  id,
  name,
  description,
  updated_at,
  permission,
  avatar
}: KnowledgeBase) {
  const t = useTranslations();
  const { formatISOString } = useISOTime();
  const [showDeleteAlert, setShowDeleteAlert] = useState(false);
  const invalidateKnowledgeBases = useInvalidateKnowledgeBases();

  const { mutate: deleteKnowledge, isPending } = useMutation({
    mutationFn: () => deleteKnowledgeBaseApi(id),
    onSuccess: () => {
      toast.success(t('Deleted Successfully'));
      invalidateKnowledgeBases();
    }
  });

  const handleDelete = () => {
    if (isPending) return;
    deleteKnowledge();
  };

  const menuItems: MenuItemProps[] = [
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
          <div className="flex items-center space-x-2">
            <Avatar className="size-8 rounded-md">
              <AvatarImage src={avatar} />
              <AvatarFallback className="rounded-md bg-primary/10">
                <Book className="size-4" />
              </AvatarFallback>
            </Avatar>
            <p className="text-lg font-medium">{name}</p>
          </div>
          <DropdownMenuButton
            items={menuItems}
            triggerClassName="h-8 w-8"
            buttonProps={{ size: 'icon' }}
          />
        </CardHeader>

        <CardContent className="min-h-[4rem]">
          <p className="text-sm text-muted-foreground truncate">{description ?? ''}</p>
        </CardContent>
        <CardFooter className="flex justify-end mt-auto">
          {/* <Badge variant="secondary">{permission === 'team' ? t('Team') : t('Only Me')}</Badge> */}
          <span className="text-sm text-muted-foreground">
            {formatISOString(updated_at, 'YYYY-MM-DD HH:mm:ss')}
          </span>
        </CardFooter>
      </Card>

      <ConfirmModal
        isShow={showDeleteAlert}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteAlert(false)}
        title={t('Delete Knowledge Base')}
        description={t('Are you sure you want to delete this knowledge base?')}
        showConfirm
        showCancel
        type="destructive"
      />
    </>
  );
}

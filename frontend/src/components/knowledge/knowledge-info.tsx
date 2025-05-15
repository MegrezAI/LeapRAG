'use client';
import { Book } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useKnowledgeBase } from '@/lib/hooks/queries/use-knowledge';
import { SidebarHeader } from '@/components/base/detail-layout/sidebar-header';

interface KnowledgeInfoProps {
  kbId: string;
}

export default function KnowledgeInfo({ kbId }: KnowledgeInfoProps) {
  const { data: kb } = useKnowledgeBase(kbId);
  if (!kb) return null;

  return (
    <>
      <SidebarHeader
        title={kb.name}
        icon={
          <Avatar className="size-8 rounded-md">
            <AvatarImage src={kb.avatar} />
            <AvatarFallback className="rounded-md">
              <Book className="size-4" />
            </AvatarFallback>
          </Avatar>
        }
      />
    </>
  );
}

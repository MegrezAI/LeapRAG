import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ModelProviderIcon } from '@/components/icon/model-provider-icon';
import { type LLMProvider } from '@/lib/constants/rag/llm';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';

interface PendingModelProviderCardProps {
  name: string;
  provider: LLMProvider;
  tags: string;
  onAdd?: () => void;
}

export function PendingModelProviderCard({
  name,
  tags,
  provider,
  onAdd
}: PendingModelProviderCardProps) {
  const tagsArray = tags.split(',');
  const t = useTranslations();
  return (
    <Card className="">
      <CardContent className="p-4 h-[150px] w-full flex flex-col justify-between">
        <div className="flex items-center gap-3">
          <ModelProviderIcon provider={provider} />
          <div>
            <h1 className="font-bold text-sm">{name}</h1>
          </div>
        </div>

        {/* tags */}
        <div className="flex flex-wrap gap-x-1 gap-y-1.5 mt-auto">
          {tagsArray.map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-[8px] px-1 py-0 text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="p-2">
        <Button variant="outline" className="w-full" onClick={onAdd}>
          <Plus className="size-4" />
          <span className="text-xs">{t('Add')}</span>
        </Button>
      </CardFooter>
    </Card>
  );
}

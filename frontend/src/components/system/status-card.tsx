import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type LucideIcon } from 'lucide-react';
import { StatusIcon } from './status-icon';
import { useTranslations } from 'next-intl';

interface StatusCardProps {
  title: string;
  icon: LucideIcon;
  status: string;
  name: string;
  elapsed: number;
  extraInfo?: string;
}

export function StatusCard({
  title,
  icon: Icon,
  status,
  name,
  elapsed,
  extraInfo
}: StatusCardProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-2">
          <StatusIcon status={status} />
          <div className="text-2xl font-bold">{name}</div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {t('Response Time')}: {elapsed}ms{extraInfo ? ` | ${extraInfo}` : ''}
        </p>
      </CardContent>
    </Card>
  );
}

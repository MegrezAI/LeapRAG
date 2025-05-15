import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusIcon } from './status-icon';
import { useTranslations } from 'next-intl';

interface SummaryCardProps {
  uptime: string;
  completedTasks: number;
  failedTasks: number;
}

export function SummaryCard({ uptime, completedTasks, failedTasks }: SummaryCardProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('System Summary')}</CardTitle>
        <CardDescription>
          {t('Comprehensive status and performance metrics for all system components')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('System Status')}</p>
              <div className="flex items-center">
                <StatusIcon status="green" />
                <span className="ml-2 font-semibold">{t('Running Normal')}</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{t('Uptime')}</p>
              <p className="font-semibold">{uptime}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

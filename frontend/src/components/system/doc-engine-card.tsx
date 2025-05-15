import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { DocEngineStatus } from '@/types/sys';
import { useTranslations } from 'next-intl';

interface DocEngineCardProps {
  data: DocEngineStatus;
}

export function DocEngineCard({ data }: DocEngineCardProps) {
  const t = useTranslations();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Document Engine Status')}</CardTitle>
        <CardDescription>
          {t('Elasticsearch Cluster Status and Performance Metrics')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="mb-4 text-lg font-medium">{t('Basic Information')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Cluster Name')}</span>
                <span className="font-medium">{data.cluster_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Status')}</span>
                <div className="flex items-center">
                  <span className="ml-2 font-medium capitalize">{data.status}</span>
                </div>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Number of Nodes')}</span>
                <span className="font-medium">{data.number_of_nodes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Data Nodes')}</span>
                <span className="font-medium">{data.number_of_data_nodes}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Response Time')}</span>
                <span className="font-medium">{data.elapsed}ms</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-lg font-medium">{t('Shard Information')}</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Active Shards')}</span>
                <span className="font-medium">{data.active_shards}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Primary Shards')}</span>
                <span className="font-medium">{data.active_primary_shards}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Relocating Shards')}</span>
                <span className="font-medium">{data.relocating_shards}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Initializing Shards')}</span>
                <span className="font-medium">{data.initializing_shards}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('Unassigned Shards')}</span>
                <span className="font-medium">{data.unassigned_shards}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-center text-sm text-muted-foreground w-full">
          <span>{t('Shard Health')}:</span>
          <span className="ml-2">{data.active_shards_percent_as_number}%</span>
        </div>
      </CardFooter>
    </Card>
  );
}

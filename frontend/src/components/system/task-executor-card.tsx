import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type ChartConfig, ChartContainer, ChartTooltip } from '@/components/ui/chart';
import { BarChart, Bar, CartesianGrid, XAxis } from 'recharts';
import type { TaskExecutorHeartbeat } from '@/types/sys';
import { useTranslations } from 'next-intl';
import useISOTime from '@/lib/hooks/use-iso-time';

interface TaskExecutorCardProps {
  executorId: string;
  heartbeats: TaskExecutorHeartbeat[keyof TaskExecutorHeartbeat];
}

export function TaskExecutorCard({ executorId, heartbeats }: TaskExecutorCardProps) {
  const t = useTranslations();

  const { formatISOString } = useISOTime();
  const chartConfig = {
    pending: {
      label: t('Pending'),
      color: 'hsl(47.9 95.8% 53.1%)' // yellow-500
    },
    lag: {
      label: t('Backlog'),
      color: 'hsl(271.5 91.7% 65.1%)' // purple-500
    }
  } satisfies ChartConfig;

  const latestHeartbeat = heartbeats[heartbeats.length - 1];
  const firstHeartbeat = heartbeats[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('Task Executor Status')}</CardTitle>
        <CardDescription>
          {t('Task Executor Running Status and Performance Metrics')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs font-medium text-muted-foreground">{t('Executor Name')}</div>
              <div className="mt-1 text-lg font-semibold">{executorId}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs font-medium text-muted-foreground">{t('Start Time')}</div>
              <div className="mt-1 text-sm font-semibold">
                {formatISOString(firstHeartbeat.boot_at || '')}
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs font-medium text-muted-foreground">{t('Completed')}</div>
              <div className="mt-1 text-lg font-semibold">{latestHeartbeat.done}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs font-medium text-muted-foreground">{t('Current Status')}</div>
              <div className="mt-1">
                {latestHeartbeat.current ? (
                  <Badge className="bg-blue-500 hover:bg-blue-600">{t('Processing')}</Badge>
                ) : (
                  <Badge variant="outline">{t('Idle')}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Current Task */}
          {/* {latestHeartbeat.current && (
            <div className="rounded-lg border p-4">
              <h3 className="mb-2 text-sm font-medium">{t('Current Task')}</h3>
              <div className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                  <div>
                    <span className="text-xs text-muted-foreground">{t('Task ID')}</span>
                    <p className="font-medium truncate">{latestHeartbeat.current.id}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">{t('Task Type')}</span>
                    <p className="font-medium">{latestHeartbeat.current.task_type}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">{t('Document Name')}</span>
                    <p className="font-medium">{latestHeartbeat.current.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">{t('Document Size')}</span>
                    <p className="font-medium">
                      {(latestHeartbeat.current.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )} */}

          {/* Task History */}
          <div>
            <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
              <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
                <CardTitle>{t('Heartbeat History')}</CardTitle>
                <CardDescription>{t('Task Executor Historical Data Statistics')}</CardDescription>
              </div>
              <div className="flex flex-wrap">
                {Object.keys(chartConfig).map((key) => {
                  const metric = key as keyof typeof chartConfig;
                  return (
                    <div
                      key={metric}
                      className="relative z-30 flex min-w-[120px] flex-1 flex-col justify-center gap-1 border-t px-4 py-3 even:border-l sm:border-l sm:border-t-0 sm:px-6 sm:py-4"
                    >
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {chartConfig[metric].label}
                      </span>
                      <span className="text-lg font-bold leading-none sm:text-2xl">
                        {latestHeartbeat[metric].toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:p-6">
              <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
                <BarChart
                  data={heartbeats
                    .slice()
                    .reverse()
                    .map((hb) => ({
                      ...hb,
                      _value: 1
                    }))}
                  margin={{
                    left: 12,
                    right: 12,
                    top: 12,
                    bottom: 12
                  }}
                  barSize={2}
                >
                  <CartesianGrid vertical={false} horizontal={false} />
                  <XAxis
                    dataKey="now"
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={32}
                    tickFormatter={(time) => formatISOString(time, 'HH:mm:ss')}
                  />
                  <Bar
                    dataKey="_value"
                    radius={[1, 1, 1, 1]}
                    isAnimationActive={false}
                    stroke="none"
                    fillOpacity={1}
                    name={t('Task Count')}
                    fill="hsl(142.1 76.2% 36.3%)"
                    fillRule="nonzero"
                  />
                  <ChartTooltip
                    content={({ payload }) => {
                      if (!payload?.[0]?.payload) return null;
                      const data = { ...payload[0].payload };
                      delete data._value;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <pre className="text-xs">{JSON.stringify(data, null, 2)}</pre>
                        </div>
                      );
                    }}
                  />
                </BarChart>
              </ChartContainer>
              <div className="mt-4 text-sm text-muted-foreground text-center">
                <span className="inline-flex items-center mr-4">
                  <span className="w-3 h-3 rounded-full bg-[hsl(142.1_76.2%_36.3%)] mr-2"></span>
                  {t('Completed')}
                </span>
                <span className="inline-flex items-center">
                  <span className="w-3 h-3 rounded-full bg-[hsl(0_84.2%_60.2%)] mr-2"></span>
                  {t('Failed')}
                </span>
              </div>
            </CardContent>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

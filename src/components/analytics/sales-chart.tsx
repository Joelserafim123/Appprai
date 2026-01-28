'use client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useTranslations } from '@/i18n';

export function SalesChart({ chartData }: { chartData: { date: string; revenue: number }[] }) {
  const t = useTranslations('AnalyticsPage');

  const chartConfig = {
    revenue: {
      label: "Receita",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  if (!chartData || chartData.length === 0) {
    return (
      <div className="flex h-[250px] w-full items-center justify-center rounded-lg border-2 border-dashed text-center">
        <p className="text-muted-foreground">{t('noChartData')}</p>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[250px] w-full">
      <BarChart accessibilityLayer data={chartData} margin={{ top: 20, right: 20, left: -10, bottom: 5 }}>
        <XAxis
          dataKey="date"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => format(new Date(value), "dd/MM", { locale: ptBR })}
        />
        <YAxis
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          tickFormatter={(value) => `R$${value}`}
        />
        <Tooltip
          cursor={false}
          content={<ChartTooltipContent
            formatter={(value) => `R$ ${Number(value).toFixed(2)}`}
            labelFormatter={(label) => format(new Date(label), "PPP", { locale: ptBR })}
            indicator="dot"
          />}
        />
        <Bar dataKey="revenue" fill="var(--color-revenue)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

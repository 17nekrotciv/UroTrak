// src/components/charts/GenericLineChart.tsx
"use client"

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ChartDataPoint {
  date: string; // ISO string date
  [key: string]: any; // Value for the Y-axis
}

interface GenericLineChartProps {
  data: ChartDataPoint[];
  xAxisKey: string; // Typically 'date'
  yAxisKey: string;
  yAxisLabel?: string;
  lineColor?: string; // Hex color string e.g. #8884d8
  title?: string;
}

const formatDateTick = (tickItem: string) => {
  try {
    return format(parseISO(tickItem), 'dd/MM', { locale: ptBR });
  } catch (e) {
    return tickItem; // Fallback if date is not parsable
  }
};

export default function GenericLineChart({
  data,
  xAxisKey,
  yAxisKey,
  yAxisLabel,
  lineColor = "hsl(var(--primary))", // Use primary color from CSS vars
  title,
}: GenericLineChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-center text-muted-foreground py-4">{title ? `${title}: ` : ''}Sem dados para exibir.</p>;
  }

  // Ensure data is sorted by date for correct line chart rendering
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="h-[300px] w-full">
      {title && <h3 className="text-lg font-semibold mb-2 text-center text-foreground">{title}</h3>}
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={sortedData}
          margin={{
            top: 5,
            right: 20,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey={xAxisKey} 
            tickFormatter={formatDateTick} 
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            stroke="hsl(var(--muted-foreground))"
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 12 } : undefined}
            tick={{ fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
              borderRadius: 'var(--radius)',
            }}
            labelFormatter={(label) => format(parseISO(label), "dd/MM/yyyy", { locale: ptBR })}
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line
            type="monotone"
            dataKey={yAxisKey}
            stroke={lineColor}
            strokeWidth={2}
            activeDot={{ r: 6 }}
            dot={{ r:3, fill: lineColor }}
            name={yAxisLabel || yAxisKey}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// src/app/dashboard/page.tsx
"use client";

import React from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { LayoutDashboard, Loader2 } from 'lucide-react';
import { useData } from '@/contexts/data-provider';
import GenericLineChart from '@/components/charts/GenericLineChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default function DashboardPage() {
  const { appData, loadingData } = useData();

  if (loadingData) {
    return (
      <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg font-semibold text-foreground">Carregando dados do painel...</p>
      </div>
    );
  }
  
  const psaDataForChart = appData.psaLogs
    .filter(log => log.psaValue !== null && log.psaValue !== undefined)
    .map(log => ({ date: log.date, 'Valor PSA': log.psaValue! }));

  const padChangesDataForChart = appData.urinaryLogs
    .filter(log => log.padChanges !== null && log.padChanges !== undefined)
    .map(log => ({ date: log.date, 'Trocas de Absorventes': log.padChanges! }));
  
  const lossGramsDataForChart = appData.urinaryLogs
    .filter(log => log.lossGrams !== null && log.lossGrams !== undefined)
    .map(log => ({ date: log.date, 'Perda (g)': log.lossGrams! }));


  const getErectionQualityScore = (quality: string) => {
    const mapping: { [key: string]: number } = {
      "none": 0,
      "partial_insufficient": 1,
      "partial_sufficient": 2,
      "full_not_sustained": 3,
      "full_sustained": 4,
    };
    return mapping[quality] ?? 0;
  }

  const erectileDataForChart = appData.erectileLogs.map(log => ({
    date: log.date,
    'Qualidade da Ereção': getErectionQualityScore(log.erectionQuality),
  }));


  return (
    <>
      <PageHeader 
        title="Painel Geral UroTrack" 
        description="Visualize o progresso da sua recuperação." 
        icon={LayoutDashboard} 
      />

      <div className="space-y-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-center">Evolução do PSA (ng/mL)</CardTitle>
          </CardHeader>
          <CardContent>
            <GenericLineChart
              data={psaDataForChart}
              xAxisKey="date"
              yAxisKey="Valor PSA"
              yAxisLabel="PSA (ng/mL)"
              lineColor="hsl(var(--chart-1))"
            />
          </CardContent>
        </Card>

        <Separator />

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-center">Evolução da Função Erétil</CardTitle>
          </CardHeader>
          <CardContent>
             <GenericLineChart
              data={erectileDataForChart}
              xAxisKey="date"
              yAxisKey="Qualidade da Ereção"
              yAxisLabel="Escala de Qualidade (0-4)"
              lineColor="hsl(var(--chart-2))"
            />
            <p className="text-xs text-muted-foreground mt-2 text-center">Escala: 0-Nenhuma, 1-Parcial Insuf., 2-Parcial Suf., 3-Total não mantida, 4-Total mantida.</p>
          </CardContent>
        </Card>

        <Separator />

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-center">Trocas de Absorventes por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <GenericLineChart
              data={padChangesDataForChart}
              xAxisKey="date"
              yAxisKey="Trocas de Absorventes"
              yAxisLabel="Nº de Trocas"
              lineColor="hsl(var(--chart-3))"
            />
          </CardContent>
        </Card>
        
        <Separator />

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline text-xl text-center">Perda Urinária (g)</CardTitle>
          </CardHeader>
          <CardContent>
            <GenericLineChart
              data={lossGramsDataForChart}
              xAxisKey="date"
              yAxisKey="Perda (g)"
              yAxisLabel="Grama(s)"
              lineColor="hsl(var(--chart-4))"
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

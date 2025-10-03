"use client";

import React, { useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { LayoutDashboard, Loader2, User } from 'lucide-react';
import { useData } from '@/contexts/data-provider';
import GenericLineChart from '@/components/charts/GenericLineChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { use } from 'react';

// A página agora recebe 'params' para obter a ID do usuário da URL
export default function UserDashboardPage({ params }: { params: Promise<{ userId: string }> }) {
    const {
        viewedUserData,
        loadingViewedUser,
        loadViewedUserData,
        viewedUserProfile
    } = useData();
    const resolvedParams = use(params); // 2. "Desembrulhe" a Promise
    const { userId } = resolvedParams;

    // Este hook carrega os dados do usuário e limpa os listeners quando o componente é desmontado
    useEffect(() => {
        if (userId) {
            const unsubscribe = loadViewedUserData(userId);
            return () => unsubscribe(); // Função de limpeza
        }
    }, [userId, loadViewedUserData]);

    if (loadingViewedUser || !viewedUserData) {
        return (
            <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg font-semibold text-foreground">Carregando dados do usuário...</p>
            </div>
        );
    }

    // Lógica de preparação dos dados para os gráficos (agora usando viewedUserData)
    const psaDataForChart = viewedUserData.psaLogs
        .filter(log => log.psaValue !== null && log.psaValue !== undefined)
        .map(log => ({
            date: log.date,
            'Valor PSA Total': log.psaValue!,
            'Observação': log.notes // ✨ ADICIONADO AQUI (ajuste o nome do campo se for diferente)
        }));

    const padChangesDataForChart = viewedUserData.urinaryLogs
        .filter(log => log.padChanges !== null && log.padChanges !== undefined)
        .map(log => ({
            date: log.date,
            'Trocas de Absorventes por dia': log.padChanges!,
            'Observação': log.medicationNotes // ✨ ADICIONADO AQUI (ajuste o nome do campo se for diferente)
        }));

    const lossGramsDataForChart = viewedUserData.urinaryLogs
        .filter(log => log.lossGrams !== null && log.lossGrams !== undefined)
        .map(log => ({
            date: log.date,
            'Perda (g)': log.lossGrams!,
            'Observação': log.medicationNotes // ✨ ADICIONADO AQUI (ajuste o nome do campo se for diferente)
        }));

    const getErectionQualityScore = (quality: string) => {
        const mapping: { [key: string]: number } = {
            "none": 0, "partial_insufficient": 1, "partial_sufficient": 2,
            "full_not_sustained": 3, "full_sustained": 4,
        };
        return mapping[quality] ?? 0;
    }

    const erectileDataForChart = viewedUserData.erectileLogs.map(log => ({
        date: log.date,
        'Qualidade da Ereção': getErectionQualityScore(log.erectionQuality),
        'Observação': log.medicationNotes // Este já estava correto!
    }));

    return (
        <>
            <div className="space-y-8">
                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl text-center">Evolução do PSA (ng/mL)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GenericLineChart data={psaDataForChart} xAxisKey="date" yAxisKey="Valor PSA Total" yAxisLabel="PSA (ng/mL)" lineColor="hsl(var(--chart-1))" />
                    </CardContent>
                </Card>

                <Separator />

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl text-center">Evolução da Função Erétil</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GenericLineChart data={erectileDataForChart} xAxisKey="date" yAxisKey="Qualidade da Ereção" yAxisLabel="Escala de Qualidade (0-4)" lineColor="hsl(var(--chart-2))" />
                        <p className="text-xs text-muted-foreground mt-2 text-center">Escala: 0-Nenhuma, 1-Parcial Insuf., 2-Parcial Suf., 3-Total não mantida, 4-Total mantida.</p>
                    </CardContent>
                </Card>

                <Separator />

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl text-center">Trocas de Absorventes por Dia</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GenericLineChart data={padChangesDataForChart} xAxisKey="date" yAxisKey="Trocas de Absorventes por dia" yAxisLabel="Nº de Trocas" lineColor="hsl(var(--chart-3))" />
                    </CardContent>
                </Card>

                <Separator />

                <Card className="shadow-lg">
                    <CardHeader>
                        <CardTitle className="font-headline text-xl text-center">Perda Urinária (g)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <GenericLineChart data={lossGramsDataForChart} xAxisKey="date" yAxisKey="Perda (g)" yAxisLabel="Grama(s)" lineColor="hsl(var(--chart-4))" />
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
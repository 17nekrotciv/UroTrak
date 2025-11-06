// src/app/doctor-dashboard/user-dashboard/[userId]/page.tsx
"use client";

import React, { useEffect, use, useState } from 'react'; // 1. Importar o useState
import PageHeader from '@/components/ui/PageHeader';
import { LayoutDashboard, Loader2, User, Calendar as CalendarIcon, X } from 'lucide-react'; // 2. Importar ícones
import { useData } from '@/contexts/data-provider';
import GenericLineChart from '@/components/charts/GenericLineChart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

// 3. Importar todos os helpers de data e componentes de UI
import { isAfter, isBefore, parseISO, startOfDay, format, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';

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

    // 4. Adicionar os estados de data, com o mês atual como padrão
    const [startDate, setStartDate] = useState<Date | undefined>(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState<Date | undefined>(endOfMonth(new Date()));

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

    // 5. Adicionar a função de filtragem
    const filterByDateRange = (log: { date: string }) => {
        const logDate = startOfDay(parseISO(log.date));

        if (startDate && isBefore(logDate, startOfDay(startDate))) {
            return false;
        }

        if (endDate && isAfter(logDate, startOfDay(endDate))) {
            return false;
        }

        return true;
    };

    // 6. Aplicar o filtro aos dados dos gráficos
    const psaDataForChart = viewedUserData.psaLogs
        .filter(filterByDateRange) // <-- FILTRO APLICADO
        .filter(log => log.psaValue !== null && log.psaValue !== undefined)
        .map(log => ({
            date: log.date,
            'Valor PSA Total': log.psaValue!,
            'Observação': log.notes
        }));

    // Filtra logs urinários uma vez
    const filteredUrinaryLogs = viewedUserData.urinaryLogs.filter(filterByDateRange);

    const padChangesDataForChart = filteredUrinaryLogs // <-- USA DADOS FILTRADOS
        .filter(log => log.padChanges !== null && log.padChanges !== undefined)
        .map(log => ({
            date: log.date,
            'Trocas de Absorventes por dia': log.padChanges!,
            'Observação': log.medicationNotes
        }));

    const lossGramsDataForChart = filteredUrinaryLogs // <-- USA DADOS FILTRADOS
        .filter(log => log.lossGrams !== null && log.lossGrams !== undefined)
        .map(log => ({
            date: log.date,
            'Perda (g)': log.lossGrams!,
            'Observação': log.medicationNotes
        }));

    const getErectionQualityScore = (quality: string) => {
        const mapping: { [key: string]: number } = {
            "none": 0, "partial_insufficient": 1, "partial_sufficient": 2,
            "full_not_sustained": 3, "full_sustained": 4,
        };
        return mapping[quality] ?? 0;
    }

    const erectileDataForChart = viewedUserData.erectileLogs
        .filter(filterByDateRange) // <-- FILTRO APLICADO
        .map(log => ({
            date: log.date,
            'Qualidade da Ereção': getErectionQualityScore(log.erectionQuality),
            'Observação': log.medicationNotes
        }));

    return (
        <>
            {/* 7. Adicionar a UI do filtro */}
            <Card className="mb-6 shadow-md">
                <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row items-center gap-4">

                        {/* Seletor de Data de Início */}
                        <div className="flex-1 w-full sm:w-auto space-y-2">
                            <Label htmlFor="date-start-picker" className="font-semibold">
                                Data Início
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date-start-picker"
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !startDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione a data inicial</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={startDate}
                                        onSelect={setStartDate}
                                        disabled={(date) => (endDate ? isAfter(date, endDate) : false)}
                                        initialFocus
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Seletor de Data de Fim */}
                        <div className="flex-1 w-full sm:w-auto space-y-2">
                            <Label htmlFor="date-end-picker" className="font-semibold">
                                Data Fim
                            </Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="date-end-picker"
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !endDate && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {endDate ? format(endDate, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione a data final</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={endDate}
                                        onSelect={setEndDate}
                                        disabled={(date) => (startDate ? isBefore(date, startDate) : false)}
                                        initialFocus
                                        locale={ptBR}
                                    />
                                </PopoverContent>
                            </Popover>
                        </div>

                        {/* Botão de Limpar Filtro */}
                        <div className="pt-0 sm:pt-7">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9"
                                onClick={() => {
                                    setStartDate(undefined);
                                    setEndDate(undefined);
                                }}
                                title="Limpar filtros"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>

                    </div>
                </CardContent>
            </Card>

            {/* O restante do JSX com os gráficos (agora filtrados) */}
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
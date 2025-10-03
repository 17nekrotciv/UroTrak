"use client";

import React, { useEffect } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { BarChart3, Loader2, Printer, User } from 'lucide-react';
import { useData } from '@/contexts/data-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { use } from 'react';

// O componente DataSection pode ser mantido como está
const DataSection: React.FC<{ title: string; data: any[]; renderItem: (item: any) => React.ReactNode }> = ({ title, data, renderItem }) => (
    <Card className="mb-6 shadow-md">
        <CardHeader>
            <CardTitle className="font-headline text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
            {data.length === 0 ? (
                <p className="text-muted-foreground">Nenhum dado registrado.</p>
            ) : (
                <ul className="space-y-3">
                    {data.map((item, index) => (
                        <li key={item.id || index} className="text-sm p-3 bg-secondary/20 rounded-md">
                            {renderItem(item)}
                        </li>
                    ))}
                </ul>
            )}
        </CardContent>
    </Card>
);

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

    // Carrega os dados do usuário com base na ID da URL
    useEffect(() => {
        if (userId) {
            const unsubscribe = loadViewedUserData(userId);
            return () => unsubscribe(); // Limpa os listeners ao sair da página
        }
    }, [userId, loadViewedUserData]);

    if (loadingViewedUser || !viewedUserData) {
        return (
            <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg font-semibold text-foreground">Carregando resumo do usuário...</p>
            </div>
        );
    }

    const handlePrint = () => {
        window.print();
    };

    const erectionQualityOptionsMap: { [key: string]: string } = {
        "none": "Nenhuma ereção",
        "partial_insufficient": "Ereção parcial, insuficiente para penetração",
        "partial_sufficient": "Ereção parcial, suficiente para penetração",
        "full_not_sustained": "Ereção total, mas não mantida",
        "full_sustained": "Ereção total e mantida",
    };

    const medicationMap: { [key: string]: string } = {
        'none': 'Nenhuma',
        'tadalafil5': 'Tadalafila (Cialis) 5mg',
        'tadalafil20': 'Tadalafila (Cialis) 20mg',
        'sildenafil': 'Sildenafila (Viagra) 50mg'
    };

    return (
        <>
            <PageHeader
                title={`Resumo de ${viewedUserProfile?.displayName || 'Usuário'}`}
                description="Visualize todos os dados de acompanhamento do usuário em um só lugar."
                icon={User}
            >
                <Button onClick={handlePrint} variant="outline">
                    <Printer className="mr-2 h-4 w-4" />
                    Imprimir Resumo
                </Button>
            </PageHeader>

            <div id="print-area">
                <ScrollArea className="h-[calc(100vh-15rem)] pr-4">
                    <DataSection
                        title="Sintomas Urinários"
                        data={viewedUserData.urinaryLogs}
                        renderItem={(log) => (
                            <>
                                <p><strong>Data:</strong> {format(parseISO(log.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                <p>Urgência: {log.urgency ? 'Sim' : 'Não'}</p>
                                <p>Ardência: {log.burning ? 'Sim' : 'Não'}</p>
                                <p>Fez Fisioterapia: {log.physiotherapyExercise ? 'Sim' : 'Não'}</p>
                                {log.lossGrams !== null && <p>Perda: {log.lossGrams}g</p>}
                                {log.padChanges !== null && <p>Absorventes: {log.padChanges}</p>}
                            </>
                        )}
                    />
                    <Separator className="my-6" />
                    <DataSection
                        title="Função Erétil"
                        data={viewedUserData.erectileLogs}
                        renderItem={(log) => {
                            let medicationText = 'Nenhuma';
                            if (Array.isArray(log.medicationUsed) && log.medicationUsed.length > 0) {
                                medicationText = log.medicationUsed
                                    .map((medId: string) => medicationMap[medId] || medId)
                                    .join(', ');
                            } else if (typeof log.medicationUsed === 'string' && log.medicationUsed !== 'none') {
                                medicationText = medicationMap[log.medicationUsed] || log.medicationUsed;
                            }

                            return (
                                <>
                                    <p><strong>Data:</strong> {format(parseISO(log.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                                    <p>Qualidade da Ereção: {erectionQualityOptionsMap[log.erectionQuality] || log.erectionQuality}</p>
                                    <p>Medicação Usada: {medicationText}</p>
                                    {log.medicationNotes && <p>Notas sobre Medicação: {log.medicationNotes}</p>}
                                </>
                            );
                        }}
                    />
                    <Separator className="my-6" />
                    <DataSection
                        title="Resultados PSA"
                        data={viewedUserData.psaLogs}
                        renderItem={(log) => (
                            <>
                                <p><strong>Data do Exame:</strong> {format(parseISO(log.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                                {log.psaValue !== null && <p>Valor do PSA: {log.psaValue.toFixed(2)} ng/mL</p>}
                                {log.notes && <p>Notas: {log.notes}</p>}
                            </>
                        )}
                    />
                </ScrollArea>
            </div>
        </>
    );
}
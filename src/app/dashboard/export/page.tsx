"use client";

import React, { useState, useEffect } from 'react';
import emojiRegex from 'emoji-regex';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import { Download, FileJson, FileText, Loader2 } from 'lucide-react';
import { useData } from '@/contexts/data-provider';
import { useToast } from '@/hooks/use-toast';

// Estendendo a interface global do Window para TypeScript
declare global {
    interface Window {
        jspdf: any;
        Chart: any; // Adiciona Chart.js ao escopo global
    }
}

export default function ExportPage() {
    const { appData, loadingData } = useData();
    const { toast } = useToast();
    const [isDownloadingJson, setIsDownloadingJson] = useState(false);
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [scriptsLoaded, setScriptsLoaded] = useState(false);

    // Carrega os scripts do jsPDF, jsPDF-AutoTable e Chart.js de um CDN
    useEffect(() => {
        const jspdfScript = document.createElement('script');
        jspdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        jspdfScript.onload = () => {
            const autotableScript = document.createElement('script');
            autotableScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
            autotableScript.onload = () => {
                const chartjsScript = document.createElement('script');
                chartjsScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
                chartjsScript.onload = () => {
                    setScriptsLoaded(true);
                };
                document.body.appendChild(chartjsScript);
            };
            document.body.appendChild(autotableScript);
        };
        document.body.appendChild(jspdfScript);
    }, []);

    // Função para pré-carregar uma imagem e convertê-la para Data URL
    const getImageDataUrl = (url: string): Promise<string> => {
        return new Promise((resolve, reject) => {
            fetch(url)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('A resposta da rede não foi bem-sucedida.');
                    }
                    return response.blob();
                })
                .then(blob => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        resolve(reader.result as string);
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(blob);
                })
                .catch(error => {
                    console.error('Erro ao buscar a imagem para o PDF:', error);
                    reject(error);
                });
        });
    };

    // Função para criar uma imagem de gráfico usando o callback onComplete
    const createChartImage = (config: any): Promise<string> => {
        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = 800;
            canvas.height = 400;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return reject(new Error('Não foi possível obter o contexto do canvas.'));
            }

            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const finalConfig = {
                ...config,
                options: { ...config.options, responsive: false, animation: { ...config.options?.animation, onComplete: () => { setTimeout(() => { const dataUrl = canvas.toDataURL('image/png'); if (dataUrl && dataUrl.length > 100) { resolve(dataUrl); } else { reject(new Error('Falha ao gerar a imagem do gráfico.')); } }, 250); } } }
            };

            new window.Chart(ctx, finalConfig);
        });
    };

    const handleDownloadJson = () => {
        if (loadingData) {
            toast({ title: "Aguarde", description: "Os dados ainda estão a carregar.", variant: "default" });
            return;
        }
        setIsDownloadingJson(true);
        try {
            const jsonData = JSON.stringify(appData, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'urotrack_data.json';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            toast({ title: "Download Iniciado", description: "Os seus dados (urotrack_data.json) estão a ser baixados." });
        } catch (error) {
            console.error("Erro ao baixar JSON:", error);
            toast({ title: "Erro no Download", description: "Não foi possível baixar os dados em JSON.", variant: "destructive" });
        } finally {
            setIsDownloadingJson(false);
        }
    };

    const handleExportPdf = async () => {
        if (!scriptsLoaded) {
            toast({ title: "Aguarde", description: "As bibliotecas de exportação ainda estão a carregar.", variant: "default" });
            return;
        }
        if (loadingData) {
            toast({ title: "Aguarde", description: "Os dados ainda estão a carregar.", variant: "default" });
            return;
        }
        setIsExportingPdf(true);
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const logoDataUrl = await getImageDataUrl('https://static.wixstatic.com/media/5c67c0_f5b3f54cdd584c12b1e2207e44cfd15b~mv2.png').catch(() => {
                toast({ title: "Aviso", description: "Não foi possível carregar o logótipo para o PDF.", variant: "default" });
                return null;
            });

            let finalY = 45; // Posição inicial do conteúdo

            const addHeader = () => {
                doc.setFillColor("#202c44");
                const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
                const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
                const headerHeight = 30;
                const leftMargin = 0;
                doc.rect(
                    leftMargin,                   // x: Start 14 units from the left
                    0,    // y: Position the top of the rectangle 20 units from the bottom
                    pageWidth,                  // width: The calculated width of the bar
                    headerHeight,                 // height: The height of the bar
                    "F"
                );
                if (logoDataUrl) {
                    const logoWidth = 45;
                    const logoHeight = logoWidth * (465 / 1006); // Manter a proporção
                    doc.addImage(logoDataUrl, 'PNG', 14, 5, logoWidth, logoHeight);
                }
                doc.setFontSize(18);
                doc.setTextColor("#FFFFFF");
                doc.text("Relatório de Dados - UroTrack", logoDataUrl ? 65 : 14, 22);
            };

            const addFooter = () => {
                const pageHeight = doc.internal.pageSize.height || doc.internal.pageSize.getHeight();
                const pageWidth = doc.internal.pageSize.width || doc.internal.pageSize.getWidth();
                doc.setFillColor("#2A2F3A");
                const footerHeight = 30;
                const leftMargin = 0;
                const footerWidth = pageWidth - (leftMargin * 2);
                doc.rect(
                    leftMargin,                   // x: Start 14 units from the left
                    pageHeight - footerHeight,    // y: Position the top of the rectangle 20 units from the bottom
                    footerWidth,                  // width: The calculated width of the bar
                    footerHeight,                 // height: The height of the bar
                    "F");
                doc.setFontSize(8);
                doc.setTextColor("#4169E1");
                doc.textWithLink("(11) 99590-1506", 47, pageHeight - 12, { url: 'https://bit.ly/2OIObBx' });
                doc.textWithLink('clinicauroonco.com.br', pageWidth - 14, pageHeight - 20, { url: 'https://clinicauroonco.com.br', align: 'right' });
                doc.textWithLink('Agendamentos', pageWidth - 14, pageHeight - 16, { url: 'http://bit.ly/2WMMiCI', align: 'right' });
                //doc.line(14, pageHeight - 30, pageWidth - 14, pageHeight - 30);
                doc.setTextColor("#FFFFFF");
                doc.text("Clinica Uro Onco | R. Borges Lagoa 1070, Cj 52, Vila Mariana - São Paulo - SP", 14, pageHeight - 20);
                doc.text("Dr. Bruno Benigno | Uro-oncologista | CRM SP 126265 | RQE 60022", 14, pageHeight - 16);
                doc.text("Contato: (11) 2769-3929 | ", 14, pageHeight - 12);
                doc.text('© 2025 UroTrack. Todos os direitos reservados.', pageWidth / 2, pageHeight - 4, { align: 'center' });
            };

            const addSection = async (title: string, head: string[][], body: (string | number)[][], chartConfig?: any) => {
                if (body.length > 0) {
                    if (finalY > 250) {
                        doc.addPage();
                        finalY = 45; // Reset Y position for new page
                    }
                    doc.setFontSize(14);
                    doc.text(title, 14, finalY);
                    finalY += 8;
                    doc.autoTable({
                        startY: finalY,
                        head: head,
                        body: body,
                        theme: 'striped',
                        headStyles: { fillColor: [38, 102, 226] },
                    });
                    finalY = doc.lastAutoTable.finalY + 10;

                    if (chartConfig) {
                        if (finalY + 90 > 250) { // Check if there is enough space for the chart
                            doc.addPage();
                            finalY = 45;
                        }
                        try {
                            const chartImage = await createChartImage(chartConfig);
                            doc.addImage(chartImage, 'PNG', 14, finalY, 180, 90);
                            finalY += 100;
                        } catch (e) {
                            console.error("Erro ao gerar imagem do gráfico:", e);
                            toast({ title: "Erro no Gráfico", description: `Não foi possível gerar o gráfico para "${title}".`, variant: "destructive" });
                        }
                    }
                }
            };

            if (appData?.urinaryLogs && appData.urinaryLogs.length > 0) {
                await addSection("Registos Urinários", [['Data', 'Perda em Gramas', 'Trocas de Absorvente']],
                    appData.urinaryLogs.map(item => [new Date(item.date).toLocaleDateString('pt-BR'), item.lossGrams ?? 0, item.padChanges ?? 0]), {
                    type: 'line',
                    data: {
                        labels: appData.urinaryLogs.map(d => new Date(d.date).toLocaleDateString('pt-BR')),
                        datasets: [{
                            label: 'Perda em Gramas', data: appData.urinaryLogs.map(d => d.lossGrams ?? 0),
                            borderColor: 'rgb(54, 162, 235)', backgroundColor: 'rgba(54, 162, 235, 0.5)', yAxisID: 'y',
                        },
                        {
                            label: 'Trocas de Absorvente por dia', data: appData.urinaryLogs.map(d => d.padChanges ?? 0),
                            borderColor: 'rgb(255, 99, 132)', backgroundColor: 'rgba(255, 99, 132, 0.5)', yAxisID: 'y1',
                        }]
                    },
                    options: {
                        scales: {
                            y: {
                                id: 'y',
                                type: 'linear',
                                position: 'left'
                            },
                            y1: {
                                id: 'y1',
                                type: 'linear',
                                position: 'right',
                                grid: {
                                    drawOnChartArea: false, // Avoids overlapping grid lines
                                },
                            }
                        }
                    }
                });
            }
            if (appData?.erectileLogs && appData.erectileLogs.length > 0) {
                const qualityMap: { [key: string]: number } = { 'none': 0, 'partial_insufficient': 1, 'partial_sufficient': 2, 'full_not_sustained': 3, 'full_sustained': 4 };
                const erectionQualityTranslation: { [key: string]: string } = { 'none': 'Nenhuma', 'partial_insufficient': 'Parcial, não suficiente', 'partial_sufficient': 'Parcial, suficiente', 'full_not_sustained': 'Total não mantida', 'full_sustained': 'Total mantida' };
                const erectionMedicationUsed: { [key: string]: string } = { 'none': 'Nenhuma', 'tadalafil5': 'Tadalafila (Cialis) 5mg', 'tadalafil20': 'Tadalafila (Cialis) 20 mg', 'sildenafil': 'Sildenafil (Viagra) 50mg' };
                await addSection("Registos de Função Erétil", [['Data', 'Qualidade da Ereção', 'Medicação Utilizada']],
                    appData.erectileLogs.map(item => {
                        let medicationText = 'Nenhuma'; if (Array.isArray(item.medicationUsed) && item.medicationUsed.length > 0) { medicationText = item.medicationUsed.map(medId => erectionMedicationUsed[medId] || medId).join(', '); } else if (typeof item.medicationUsed === 'string' && item.medicationUsed !== 'none') { medicationText = erectionMedicationUsed[item.medicationUsed] || item.medicationUsed; } return [new Date(item.date).toLocaleDateString('pt-BR'), erectionQualityTranslation[item.erectionQuality] ?? item.erectionQuality ?? 'Não Registado', medicationText];
                    }),
                    {
                        type: 'line',
                        data: {
                            labels: appData.erectileLogs.map(d => new Date(d.date).toLocaleDateString('pt-BR')),
                            datasets: [{
                                label: 'Qualidade da Ereção',
                                data: appData.erectileLogs.map(d => qualityMap[d.erectionQuality] ?? 0),
                                borderColor: 'rgb(54, 162, 235)', backgroundColor: 'rgba(54, 162, 235, 0.5)', stepped: true
                            }]
                        },
                        options: {
                            scales: {
                                y: {
                                    ticks: { stepSize: 1, callback: function (value: number) { const labelMap: { [key: number]: string } = { 0: 'Nenhuma', 1: 'Insuf.', 2: 'Sufic.', 3: 'Não Mant.', 4: 'Mantida' }; return labelMap[value] || ''; } },
                                    min: 0, max: 4
                                }
                            }
                        }
                    });
            }
            if (appData?.psaLogs && appData.psaLogs.length > 0) {
                await addSection("Registos de PSA", [['Data', 'Valor (ng/mL)']],
                    appData.psaLogs.map(item => [new Date(item.date).toLocaleDateString('pt-BR'), item.psaValue ?? 0]), {
                    type: 'line',
                    data: {
                        labels: appData.psaLogs.map(d => new Date(d.date).toLocaleDateString('pt-BR')),
                        datasets: [{
                            label: 'PSA Total (ng/mL)', data: appData.psaLogs.map(d => d.psaValue ?? 0),
                            borderColor: 'rgb(54, 162, 235)', backgroundColor: 'rgba(54, 162, 235, 0.5)'
                        }]
                    }
                });
            }

            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                addHeader();
                addFooter();
            }

            doc.save('urotrack_relatorio.pdf');
            toast({ title: "Exportação Concluída", description: "O seu relatório (urotrack_relatorio.pdf) foi gerado." });

        } catch (error) {
            console.error("Erro ao exportar PDF:", error);
            const errorMessage = error instanceof Error ? error.message : "Não foi possível gerar o relatório em PDF.";
            toast({ title: "Erro na Exportação", description: errorMessage, variant: "destructive" });
        } finally {
            setIsExportingPdf(false);
        }
    };

    return (
        <div className="p-4 font-sans bg-gray-50 min-h-screen">
            <PageHeader title="Exportar Dados" description="Exporte os seus dados registados no UroTrack." icon={Download} />

            <Card className="mb-8">
                <CardHeader>
                    <CardTitle>Download dos Dados em JSON</CardTitle>
                    <CardDescription>
                        Pode baixar todos os seus dados registados em formato JSON. Este formato é útil para backup ou para ser utilizado por outras aplicações.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleDownloadJson} disabled={loadingData || isDownloadingJson}>
                        {isDownloadingJson ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileJson className="mr-2 h-4 w-4" />}
                        Baixar Dados em JSON
                    </Button>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-gray-500">
                        O ficheiro JSON conterá todos os seus registos de sintomas urinários, função erétil e PSA.
                    </p>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Exportar Relatório para PDF</CardTitle>
                    <CardDescription>
                        Gere um relatório consolidado em formato PDF com tabelas e gráficos de todos os seus dados registados. Ideal para imprimir ou partilhar com o seu médico.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleExportPdf} disabled={loadingData || isExportingPdf || !scriptsLoaded}>
                        {isExportingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                        Gerar Relatório em PDF
                    </Button>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-gray-500">
                        O ficheiro PDF conterá tabelas e gráficos com os seus registos de sintomas urinários, função erétil e PSA.
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}

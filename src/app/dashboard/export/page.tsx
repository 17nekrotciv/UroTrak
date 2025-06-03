// src/app/dashboard/export/page.tsx
"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import { Download, FileJson, Loader2 } from 'lucide-react';
import { useData } from '@/contexts/data-provider';
import { useToast } from '@/hooks/use-toast';

export default function ExportPage() {
  const { appData, loadingData } = useData();
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadJson = () => {
    if (loadingData) {
      toast({ title: "Aguarde", description: "Os dados ainda estão carregando.", variant: "default" });
      return;
    }
    setIsDownloading(true);
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
      toast({ title: "Download Iniciado", description: "Seus dados (urotrack_data.json) estão sendo baixados." });
    } catch (error) {
      console.error("Error downloading JSON:", error);
      toast({ title: "Erro no Download", description: "Não foi possível baixar os dados.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <PageHeader title="Exportar Dados" description="Exporte seus dados registrados no UroTrack." icon={Download} />
      
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Download dos Dados em JSON</CardTitle>
          <CardDescription>
            Você pode baixar todos os seus dados registrados em formato JSON. Este formato é útil para backup ou para ser utilizado por outros aplicativos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDownloadJson} disabled={loadingData || isDownloading} className="w-full sm:w-auto">
            {isDownloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileJson className="mr-2 h-4 w-4" />}
            Baixar Dados em JSON
          </Button>
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            O arquivo JSON conterá todos os seus registros de sintomas urinários, função erétil e PSA.
          </p>
        </CardFooter>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Exportar para PDF / Excel (Em Breve)</CardTitle>
          <CardDescription>
            A funcionalidade de exportar seus dados e gráficos consolidados para formatos PDF ou Excel está em desenvolvimento e será disponibilizada em breve.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Agradecemos sua paciência enquanto trabalhamos para implementar esta funcionalidade. Enquanto isso, você pode utilizar a opção de download em JSON ou a página "Resumo de Dados" para visualização e impressão (Ctrl+P / Cmd+P) pelo navegador.
          </p>
        </CardContent>
      </Card>
    </>
  );
}

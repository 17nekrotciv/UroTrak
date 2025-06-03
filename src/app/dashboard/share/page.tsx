// src/app/dashboard/share/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import { generateReferralLink, type GenerateReferralLinkInput } from '@/ai/flows/referral-link-generator';
import { Loader2, Share2, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SharePage() {
  const [referralText, setReferralText] = useState('');
  const [loading, setLoading] = useState(false);
  const [appUrl, setAppUrl] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    // This ensures window is defined, so it runs only on client-side
    setAppUrl(window.location.origin);
  }, []);

  const handleGenerateLink = async () => {
    if (!appUrl) {
      toast({ title: "Erro", description: "Não foi possível determinar o URL do aplicativo.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const input: GenerateReferralLinkInput = { appUrl };
      const result = await generateReferralLink(input);
      setReferralText(result.referralText);
    } catch (error) {
      console.error("Error generating referral link:", error);
      toast({ title: "Erro ao gerar link", description: "Tente novamente mais tarde.", variant: "destructive" });
      setReferralText("Não foi possível gerar o texto de compartilhamento no momento.");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (referralText) {
      navigator.clipboard.writeText(referralText)
        .then(() => {
          toast({ title: "Copiado!", description: "Texto de compartilhamento copiado para a área de transferência." });
        })
        .catch(err => {
          toast({ title: "Erro ao copiar", description: "Não foi possível copiar o texto.", variant: "destructive" });
          console.error('Failed to copy text: ', err);
        });
    }
  };

  return (
    <>
      <PageHeader title="Compartilhar UroTrack" description="Compartilhe este aplicativo com amigos e familiares." icon={Share2} />
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Gerar Mensagem de Compartilhamento</CardTitle>
          <CardDescription>
            Clique no botão abaixo para gerar uma mensagem personalizada que você pode copiar e colar para compartilhar o UroTrack.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleGenerateLink} disabled={loading || !appUrl} className="w-full sm:w-auto">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />}
            Gerar Mensagem
          </Button>
          
          {referralText && (
            <div className="space-y-2">
              <Textarea
                value={referralText}
                readOnly
                rows={5}
                className="bg-muted/50"
                aria-label="Texto de compartilhamento gerado"
              />
              <Button onClick={copyToClipboard} variant="outline" size="sm" className="w-full sm:w-auto">
                <Copy className="mr-2 h-4 w-4" />
                Copiar Texto
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <p className="text-xs text-muted-foreground">
            Este link ajudará outras pessoas a conhecerem o UroTrack e acompanharem sua recuperação.
          </p>
        </CardFooter>
      </Card>
    </>
  );
}

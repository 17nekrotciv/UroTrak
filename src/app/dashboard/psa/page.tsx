
// src/app/dashboard/psa/page.tsx
"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import { DatePickerField } from '@/components/forms/FormParts';
import { useData } from '@/contexts/data-provider';
import type { PSALogEntry } from '@/types';
import { Loader2, ClipboardList, Save, PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-provider';
import { useRouter } from 'next/navigation';

const singlePsaEntrySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida." }),
  psaValue: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
    z.number().min(0, "Valor do PSA deve ser zero ou maior.").nullable()
  ),
  notes: z.string().optional(),
});

const psaFormSchema = z.object({
  entries: z.array(singlePsaEntrySchema).min(1, "Adicione pelo menos um resultado."),
});

type PSAFormInputs = z.infer<typeof psaFormSchema>;
type SinglePSAEntryInput = z.infer<typeof singlePsaEntrySchema>;

const getDefaultPSAEntry = (): SinglePSAEntryInput => ({
  date: new Date().toISOString(),
  psaValue: null,
  notes: '',
});

export default function PSAPage() {
  const { user } = useAuth();
  const { appData, addPSALog, loadingData } = useData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<PSAFormInputs>({
    resolver: zodResolver(psaFormSchema),
    defaultValues: {
      entries: [getDefaultPSAEntry()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries",
  });

  const onSubmit: SubmitHandler<PSAFormInputs> = async (data) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para salvar dados.", variant: "destructive" });
      return;
    }

    if (data.entries.length === 0) {
      toast({ title: "Nenhum registro", description: "Adicione pelo menos um resultado para salvar.", variant: "default" });
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const entry of data.entries) {
        try {
          const logData: Omit<PSALogEntry, 'id'|'date'> & { date: Date } = {
            ...entry,
            date: new Date(entry.date),
            psaValue: entry.psaValue ?? null,
          };
          await addPSALog(logData);
          successCount++;
        } catch (error: any) {
          console.error("Erro ao submeter resultado PSA individual:", error.message || error, error);
          errorCount++;
        }
      }
    
      if (successCount > 0) {
        if (errorCount === 0) {
         // Toast de sucesso total não é mais necessário aqui, pois haverá redirecionamento
        } else {
          toast({ title: "Parcialmente salvo", description: `${successCount} resultado(s) salvo(s). ${errorCount} falhou(ram).`, variant: "default" });
        }
        router.push('/dashboard/success');
      } else if (errorCount > 0) {
        toast({ title: "Erro ao Salvar", description: `Nenhum resultado foi salvo. ${errorCount > 1 ? 'Todos os' : 'O'} ${errorCount} resultado(s) falhou(ram). Verifique os dados e tente novamente.`, variant: "destructive" });
      }
    } catch (e) {
      console.error("Erro inesperado no processo de submissão de PSA:", e);
      toast({ title: "Erro Inesperado", description: "Ocorreu um erro ao processar sua solicitação de PSA.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      const newDefaultFormValues = getDefaultPSAEntry();
      reset({ entries: [newDefaultFormValues] });
    }
  };

  return (
    <>
      <PageHeader title="Resultados PSA" description="Registre seus resultados de exames PSA. Adicione múltiplos resultados de uma vez." icon={ClipboardList} />
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {fields.map((field, index) => (
          <Card key={field.id} className="mb-6 shadow-md p-4 relative">
            <CardHeader className="p-2 -mt-2">
              <CardTitle className="font-headline text-lg">Resultado PSA {index + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-2">
              <DatePickerField 
                control={control} 
                name={`entries.${index}.date`} 
                label="Data do Exame" 
                error={errors.entries?.[index]?.date?.message} 
              />

              <div className="space-y-2">
                <Label htmlFor={`entries.${index}.psaValue`}>Valor do PSA (ng/mL)</Label>
                <Input 
                  id={`entries.${index}.psaValue`} 
                  type="number" 
                  step="0.01" 
                  placeholder="Ex: 0.05" 
                  {...register(`entries.${index}.psaValue`)} 
                  className={errors.entries?.[index]?.psaValue ? "border-destructive" : ""} 
                />
                {errors.entries?.[index]?.psaValue && <p className="text-sm text-destructive">{errors.entries?.[index]?.psaValue?.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`entries.${index}.notes`}>Notas Adicionais (opcional)</Label>
                <Textarea 
                  id={`entries.${index}.notes`} 
                  placeholder="Ex: Laboratório, observações médicas, etc." 
                  {...register(`entries.${index}.notes`)} 
                />
              </div>
              
              {fields.length > 1 && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => remove(index)} 
                  className="absolute top-4 right-4"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remover
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Button type="button" variant="outline" onClick={() => append(getDefaultPSAEntry())} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Outro Resultado PSA
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || fields.length === 0}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar {fields.length > 1 ? `${fields.length} Resultados` : 'Resultado'}
          </Button>
        </div>
        {errors.entries?.root && <p className="text-sm text-destructive mt-2">{errors.entries.root.message}</p>}
        {errors.entries && !errors.entries.root && errors.entries.length > 0 && (
            <p className="text-sm text-destructive mt-2">Verifique os erros nos registros acima.</p>
        )}
      </form>

      <Card className="mt-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Histórico de Resultados PSA</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : appData.psaLogs.length === 0 ? (
            <p className="text-muted-foreground">Nenhum resultado PSA encontrado.</p>
          ) : (
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <ul className="space-y-4">
                {appData.psaLogs.map((log) => (
                  <li key={log.id} className="p-3 bg-secondary/30 rounded-md text-sm">
                    <p className="font-semibold">{format(new Date(log.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                    {log.psaValue !== null && <p>PSA: {log.psaValue.toFixed(2)} ng/mL</p>}
                    {log.notes && <p>Notas: {log.notes}</p>}
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </>
  );
}
    
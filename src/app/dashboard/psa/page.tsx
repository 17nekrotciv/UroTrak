// src/app/dashboard/psa/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
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
import { Loader2, ClipboardList, Save, PlusCircle } from 'lucide-react'; // Added PlusCircle
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';


const psaSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida." }),
  psaValue: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, "Valor do PSA deve ser zero ou maior.").nullable()
  ),
  notes: z.string().optional(),
});

type PSAFormInputs = z.infer<typeof psaSchema>;

const defaultFormValues: PSAFormInputs = {
  date: new Date().toISOString(),
  psaValue: null,
  notes: '',
};

export default function PSAPage() {
  const { appData, addPSALog, loadingData } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionState, setActionState] = useState<'save' | 'addNext'>('save');

  const { control, register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<PSAFormInputs>({
    resolver: zodResolver(psaSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (isDirty && actionState === 'addNext') {
      setActionState('save');
    }
  }, [isDirty, actionState]);

  const onSubmit: SubmitHandler<PSAFormInputs> = async (data) => {
    setIsSubmitting(true);
    try {
      const logData: Omit<PSALogEntry, 'id'|'date'> & { date: Date } = {
        ...data,
        date: new Date(data.date),
        psaValue: data.psaValue ?? null,
      };
      await addPSALog(logData);
      reset(defaultFormValues); 
      setActionState('addNext');
    } catch (error) {
      // Toast de erro é tratado pelo DataProvider
      console.error("Erro ao submeter registro de PSA:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  let ButtonIconComponent = Save;
  let buttonText = "Salvar Resultado PSA";

  if (isSubmitting) {
    ButtonIconComponent = Loader2;
    buttonText = "Salvando...";
  } else if (actionState === 'addNext') {
    ButtonIconComponent = PlusCircle;
    buttonText = "Adicionar Novo Resultado PSA";
  }


  return (
    <>
      <PageHeader title="Resultados PSA" description="Registre seus resultados de exames PSA." icon={ClipboardList} />
      
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Novo Registro de PSA</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <DatePickerField control={control} name="date" label="Data do Exame" error={errors.date?.message} />

            <div className="space-y-2">
              <Label htmlFor="psaValue">Valor do PSA (ng/mL)</Label>
              <Input id="psaValue" type="number" step="0.01" placeholder="Ex: 0.05" {...register("psaValue")} className={errors.psaValue ? "border-destructive" : ""} />
              {errors.psaValue && <p className="text-sm text-destructive">{errors.psaValue.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas Adicionais (opcional)</Label>
              <Textarea id="notes" placeholder="Ex: Laboratório, observações médicas, etc." {...register("notes")} />
            </div>
            
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              <ButtonIconComponent className={isSubmitting ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              {buttonText}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
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

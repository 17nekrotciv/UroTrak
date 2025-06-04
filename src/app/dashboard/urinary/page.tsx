// src/app/dashboard/urinary/page.tsx
"use client";

import React, { useState } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import { DatePickerField } from '@/components/forms/FormParts';
import { useData } from '@/contexts/data-provider';
import type { UrinaryLogEntry } from '@/types';
import { Loader2, Droplets, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const urinarySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida." }),
  urgency: z.boolean().default(false),
  burning: z.boolean().default(false),
  lossGrams: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().min(0, "Deve ser zero ou maior").nullable().optional()
  ),
  padChanges: z.preprocess(
    (val) => (val === "" ? null : Number(val)),
    z.number().int("Deve ser um número inteiro").min(0, "Deve ser zero ou maior").nullable().optional()
  ),
});

type UrinaryFormInputs = z.infer<typeof urinarySchema>;

export default function UrinaryPage() {
  const { appData, addUrinaryLog, loadingData } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<UrinaryFormInputs>({
    resolver: zodResolver(urinarySchema),
    defaultValues: {
      date: new Date().toISOString(),
      urgency: false,
      burning: false,
      lossGrams: null,
      padChanges: null,
    },
  });

  const onSubmit: SubmitHandler<UrinaryFormInputs> = async (data) => {
    setIsSubmitting(true);
    try {
      const logData: Omit<UrinaryLogEntry, 'id' | 'date'> & { date: Date } = {
        ...data,
        date: new Date(data.date), 
        lossGrams: data.lossGrams ?? null,
        padChanges: data.padChanges ?? null,
      };
      await addUrinaryLog(logData);
      reset({ 
          date: new Date().toISOString(), 
          urgency: false, 
          burning: false, 
          lossGrams: null, 
          padChanges: null 
      });
    } catch (error) {
      // Toast de erro é tratado pelo DataProvider
      console.error("Erro ao submeter registro urinário:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Sintomas Urinários" description="Registre seus sintomas urinários aqui." icon={Droplets} />
      
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Novo Registro Urinário</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <DatePickerField control={control} name="date" label="Data do Registro" error={errors.date?.message} />

            <div className="flex items-center space-x-3">
              <Controller
                name="urgency"
                control={control}
                render={({ field }) => (
                  <Checkbox id="urgency" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="urgency" className="font-normal">Sentiu urgência para urinar?</Label>
            </div>
            
            <div className="flex items-center space-x-3">
              <Controller
                name="burning"
                control={control}
                render={({ field }) => (
                  <Checkbox id="burning" checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
              <Label htmlFor="burning" className="font-normal">Sentiu ardência ao urinar?</Label>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="lossGrams">Perda em gramas (opcional)</Label>
                <Input id="lossGrams" type="number" step="any" placeholder="Ex: 50" {...register("lossGrams")} />
                {errors.lossGrams && <p className="text-sm text-destructive">{errors.lossGrams.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="padChanges">Trocas de absorventes (opcional)</Label>
                <Input id="padChanges" type="number" placeholder="Ex: 3" {...register("padChanges")} />
                {errors.padChanges && <p className="text-sm text-destructive">{errors.padChanges.message}</p>}
              </div>
            </div>
            
            <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar Registro
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Histórico de Registros Urinários</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingData ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : appData.urinaryLogs.length === 0 ? (
            <p className="text-muted-foreground">Nenhum registro encontrado.</p>
          ) : (
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <ul className="space-y-4">
                {appData.urinaryLogs.map((log) => (
                  <li key={log.id} className="p-3 bg-secondary/30 rounded-md text-sm">
                    <p className="font-semibold">{format(new Date(log.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    <p>Urgência: {log.urgency ? 'Sim' : 'Não'}</p>
                    <p>Ardência: {log.burning ? 'Sim' : 'Não'}</p>
                    {log.lossGrams !== null && <p>Perda: {log.lossGrams}g</p>}
                    {log.padChanges !== null && <p>Absorventes: {log.padChanges}</p>}
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

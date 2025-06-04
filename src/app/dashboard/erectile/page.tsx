// src/app/dashboard/erectile/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import { DatePickerField } from '@/components/forms/FormParts';
import { useData } from '@/contexts/data-provider';
import type { ErectileLogEntry } from '@/types';
import { Loader2, HeartPulse, Save, PlusCircle } from 'lucide-react'; // Added PlusCircle
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const erectileSchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida." }),
  erectionQuality: z.string().min(1, { message: "Qualidade da ereção é obrigatória." }),
  medicationUsed: z.enum(['none', 'tadalafil5', 'tadalafil20', 'sildenafil']),
  medicationNotes: z.string().optional(),
});

type ErectileFormInputs = z.infer<typeof erectileSchema>;

const erectionQualityOptions = [
  { value: "none", label: "Nenhuma ereção" },
  { value: "partial_insufficient", label: "Ereção parcial, insuficiente para penetração" },
  { value: "partial_sufficient", label: "Ereção parcial, suficiente para penetração" },
  { value: "full_not_sustained", label: "Ereção total, mas não mantida" },
  { value: "full_sustained", label: "Ereção total e mantida" },
];

const defaultFormValues: ErectileFormInputs = {
  date: new Date().toISOString(),
  erectionQuality: '',
  medicationUsed: 'none',
  medicationNotes: '',
};

export default function ErectilePage() {
  const { appData, addErectileLog, loadingData } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionState, setActionState] = useState<'save' | 'addNext'>('save');

  const { control, register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<ErectileFormInputs>({
    resolver: zodResolver(erectileSchema),
    defaultValues: defaultFormValues,
  });

  useEffect(() => {
    if (isDirty && actionState === 'addNext') {
      setActionState('save');
    }
  }, [isDirty, actionState]);

  const onSubmit: SubmitHandler<ErectileFormInputs> = async (data) => {
    setIsSubmitting(true);
    try {
      const logData: Omit<ErectileLogEntry, 'id' | 'date'> & { date: Date } = {
        ...data,
        date: new Date(data.date),
      };
      await addErectileLog(logData);
      reset(defaultFormValues);
      setActionState('addNext');
    } catch (error) {
      // A lógica de toast de erro já está no addErectileLog (via DataProvider)
      console.error("Erro ao submeter registro de função erétil:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  let ButtonIconComponent = Save;
  let buttonText = "Salvar Registro";

  if (isSubmitting) {
    ButtonIconComponent = Loader2;
    buttonText = "Salvando...";
  } else if (actionState === 'addNext') {
    ButtonIconComponent = PlusCircle;
    buttonText = "Adicionar Novo Registro";
  }

  return (
    <>
      <PageHeader title="Função Erétil" description="Registre informações sobre sua função erétil." icon={HeartPulse} />
      
      <Card className="mb-8 shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-xl">Novo Registro de Função Erétil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <DatePickerField control={control} name="date" label="Data do Registro" error={errors.date?.message} />

            <div className="space-y-2">
              <Label htmlFor="erectionQuality">Qualidade da Ereção</Label>
              <Controller
                name="erectionQuality"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value} >
                    <SelectTrigger id="erectionQuality" className={errors.erectionQuality ? "border-destructive" : ""}>
                      <SelectValue placeholder="Selecione a qualidade da ereção" />
                    </SelectTrigger>
                    <SelectContent>
                      {erectionQualityOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.erectionQuality && <p className="text-sm text-destructive">{errors.erectionQuality.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Fez uso de medicação?</Label>
              <Controller
                name="medicationUsed"
                control={control}
                render={({ field }) => (
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value} 
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-3"><RadioGroupItem value="none" id="med_none" /><Label htmlFor="med_none" className="font-normal">Não usei medicação</Label></div>
                    <div className="flex items-center space-x-3"><RadioGroupItem value="tadalafil5" id="med_tada5" /><Label htmlFor="med_tada5" className="font-normal">Tadalafila 5mg</Label></div>
                    <div className="flex items-center space-x-3"><RadioGroupItem value="tadalafil20" id="med_tada20" /><Label htmlFor="med_tada20" className="font-normal">Tadalafila 20mg</Label></div>
                    <div className="flex items-center space-x-3"><RadioGroupItem value="sildenafil" id="med_sild" /><Label htmlFor="med_sild" className="font-normal">Sildenafila (Viagra)</Label></div>
                  </RadioGroup>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="medicationNotes">Notas sobre a medicação (opcional)</Label>
              <Textarea id="medicationNotes" placeholder="Ex: Efeito, duração, etc." {...register("medicationNotes")} />
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
          <CardTitle className="font-headline text-xl">Histórico de Função Erétil</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingData ? (
             <div className="flex justify-center items-center py-8">
               <Loader2 className="h-8 w-8 animate-spin text-primary" />
             </div>
          ) : appData.erectileLogs.length === 0 ? (
            <p className="text-muted-foreground">Nenhum registro encontrado.</p>
          ) : (
            <ScrollArea className="h-[300px] w-full rounded-md border p-4">
              <ul className="space-y-4">
                {appData.erectileLogs.map((log) => (
                  <li key={log.id} className="p-3 bg-secondary/30 rounded-md text-sm">
                    <p className="font-semibold">{format(new Date(log.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                    <p>Qualidade: {erectionQualityOptions.find(opt => opt.value === log.erectionQuality)?.label || log.erectionQuality}</p>
                    <p>Medicação: 
                      {log.medicationUsed === 'none' && 'Nenhuma'}
                      {log.medicationUsed === 'tadalafil5' && 'Tadalafila 5mg'}
                      {log.medicationUsed === 'tadalafil20' && 'Tadalafila 20mg'}
                      {log.medicationUsed === 'sildenafil' && 'Sildenafila'}
                    </p>
                    {log.medicationNotes && <p>Notas: {log.medicationNotes}</p>}
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

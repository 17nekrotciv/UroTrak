// src/app/dashboard/urinary/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import { DatePickerField } from '@/components/forms/FormParts';
import { useData } from '@/contexts/data-provider';
import type { UrinaryLogEntry } from '@/types';
import { Loader2, Droplets, Save, PlusCircle } from 'lucide-react';
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

const defaultFormValues: UrinaryFormInputs = {
  date: new Date().toISOString(),
  urgency: false,
  burning: false,
  lossGrams: null,
  padChanges: null,
};

export default function UrinaryPage() {
  const { appData, addUrinaryLog, loadingData } = useData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionState, setActionState] = useState<'save' | 'addNext'>('save');

  const { control, register, handleSubmit, reset, watch, formState: { errors } } = useForm<UrinaryFormInputs>({
    resolver: zodResolver(urinarySchema),
    defaultValues: defaultFormValues,
  });

  const watchedFields = watch(); // Observa todos os campos

  useEffect(() => {
    // Se o formulário foi modificado pelo usuário E o estado do botão é 'addNext'
    // (ou seja, estava pronto para um novo registro, mas o usuário começou a editar),
    // então redefina o estado do botão para 'save'.
    // Comparamos os valores atuais com os defaultFormValues para simular 'isDirty'
    // de uma forma que nos dá mais controle após o reset.
    let dirty = false;
    for (const key in watchedFields) {
      const typedKey = key as keyof UrinaryFormInputs;
      if (watchedFields[typedKey] !== defaultFormValues[typedKey]) {
         // Tratamento especial para data, pois new Date().toISOString() sempre será diferente
        if (typedKey === 'date' && actionState === 'addNext') {
            // Se for a data e estivermos no modo 'addNext', consideramos 'dirty' se o usuário mudar a data
            // (o reset já terá definido uma nova data padrão para 'addNext')
            // Esta comparação é simplista; para datas, pode precisar de uma lógica mais robusta se o reset da data
            // for para um valor diferente do new Date() inicial do defaultFormValues.
            // No entanto, com `reset(defaultFormValues)` e `defaultFormValues.date = new Date().toISOString()`,
            // a data sempre será "nova" após o reset, então uma simples edição a tornará "dirty".
        } else if (typedKey !== 'date') {
          dirty = true;
          break;
        }
      }
    }
    // Uma forma mais simples de verificar se algo mudou desde o 'defaultFormValues'
    // após o reset para o modo 'addNext'.
    const hasUserMadeChanges = JSON.stringify(watchedFields) !== JSON.stringify(defaultFormValues);


    if (hasUserMadeChanges && actionState === 'addNext') {
       // Verifica se algum valor (exceto a data que é sempre nova) mudou desde o estado 'defaultFormValues'
        const valuesChanged = (Object.keys(defaultFormValues) as Array<keyof UrinaryFormInputs>).some(key => {
            if (key === 'date') return false; // Ignora a data para esta verificação específica
            return watchedFields[key] !== defaultFormValues[key];
        });

        if(valuesChanged) {
            setActionState('save');
        }
    }
  }, [watchedFields, actionState, defaultFormValues]);


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
      // Recria defaultFormValues para ter a data atual para o próximo registro
      const newDefaultFormValues = {
        ...defaultFormValues,
        date: new Date().toISOString(), 
        // Mantém os outros campos como padrão para um formulário "limpo"
        urgency: false,
        burning: false,
        lossGrams: null,
        padChanges: null,
      };
      reset(newDefaultFormValues); 
      setActionState('addNext');
    } catch (error) {
      console.error("Erro ao submeter registro urinário:", error);
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

  // Quando qualquer campo do formulário muda, e o estado é 'addNext', reverte para 'save'
  const handleFormChange = () => {
    if (actionState === 'addNext') {
      setActionState('save');
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
          <form onSubmit={handleSubmit(onSubmit)} onChange={handleFormChange} className="space-y-6">
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
              <ButtonIconComponent className={isSubmitting ? "mr-2 h-4 w-4 animate-spin" : "mr-2 h-4 w-4"} />
              {buttonText}
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

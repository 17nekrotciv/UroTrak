
// src/app/dashboard/urinary/page.tsx
"use client";

import React, { useState } from 'react';
import { useForm, Controller, type SubmitHandler, useFieldArray } from 'react-hook-form';
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
import { Loader2, Droplets, Save, PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-provider';
import { useRouter } from 'next/navigation';

const singleUrinaryEntrySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida." }),
  urgency: z.boolean().default(false),
  burning: z.boolean().default(false),
  lossGrams: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
    z.number().min(0, "Deve ser zero ou maior").nullable().optional()
  ),
  padChanges: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
    z.number().int("Deve ser um número inteiro").min(0, "Deve ser zero ou maior").nullable().optional()
  ),
});

const urinaryFormSchema = z.object({
  entries: z.array(singleUrinaryEntrySchema).min(1, "Adicione pelo menos um registro."),
});

type UrinaryFormInputs = z.infer<typeof urinaryFormSchema>;
type SingleUrinaryEntryInput = z.infer<typeof singleUrinaryEntrySchema>;

const getDefaultUrinaryEntry = (): SingleUrinaryEntryInput => ({
  date: new Date().toISOString(),
  urgency: false,
  burning: false,
  lossGrams: null,
  padChanges: null,
});

export default function UrinaryPage() {
  const { user } = useAuth();
  const { appData, addUrinaryLog, loadingData } = useData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<UrinaryFormInputs>({
    resolver: zodResolver(urinaryFormSchema),
    defaultValues: {
      entries: [getDefaultUrinaryEntry()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries",
  });

  const onSubmit: SubmitHandler<UrinaryFormInputs> = async (data) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para salvar dados.", variant: "destructive" });
      return;
    }

    if (data.entries.length === 0) {
      toast({ title: "Nenhum registro", description: "Adicione pelo menos um registro para salvar.", variant: "default" });
      return;
    }
    
    setIsSubmitting(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const entry of data.entries) {
        try {
          const logData: Omit<UrinaryLogEntry, 'id' | 'date'> & { date: Date } = {
            ...entry,
            date: new Date(entry.date),
            lossGrams: entry.lossGrams ?? null,
            padChanges: entry.padChanges ?? null,
          };
          await addUrinaryLog(logData);
          successCount++;
        } catch (error: any) {
          console.error("Erro ao submeter registro urinário individual:", error.message || error, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        if (errorCount === 0) {
          // Toast de sucesso total não é mais necessário aqui, pois haverá redirecionamento
        } else {
          toast({ title: "Parcialmente salvo", description: `${successCount} registro(s) salvo(s). ${errorCount} falhou(ram).`, variant: "default" });
        }
        router.push('/dashboard/success'); 
      } else if (errorCount > 0) {
        toast({ title: "Erro ao Salvar", description: `Nenhum registro foi salvo. ${errorCount > 1 ? 'Todos os' : 'O'} ${errorCount} registro(s) falhou(ram). Verifique os dados e tente novamente.`, variant: "destructive" });
      }
    } catch (e) {
      console.error("Erro inesperado no processo de submissão urinária:", e);
      toast({ title: "Erro Inesperado", description: "Ocorreu um erro ao processar sua solicitação de sintomas urinários.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
      // Resetar mesmo se não houve sucesso para limpar o formulário para nova tentativa ou nova entrada
      const newDefaultFormValues = getDefaultUrinaryEntry();
      reset({ entries: [newDefaultFormValues] });
    }
  };

  return (
    <>
      <PageHeader title="Sintomas Urinários" description="Registre seus sintomas urinários aqui. Adicione múltiplos registros de uma vez." icon={Droplets} />
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {fields.map((field, index) => (
          <Card key={field.id} className="mb-6 shadow-md p-4 relative">
            <CardHeader className="p-2 -mt-2">
              <CardTitle className="font-headline text-lg">Registro Urinário {index + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-2">
              <DatePickerField 
                control={control} 
                name={`entries.${index}.date`} 
                label="Data do Registro" 
                error={errors.entries?.[index]?.date?.message} 
              />

              <div className="flex items-center space-x-3">
                <Controller
                  name={`entries.${index}.urgency`}
                  control={control}
                  render={({ field: controllerField }) => (
                    <Checkbox 
                      id={`entries.${index}.urgency`} 
                      checked={controllerField.value} 
                      onCheckedChange={controllerField.onChange} 
                    />
                  )}
                />
                <Label htmlFor={`entries.${index}.urgency`} className="font-normal">Sentiu urgência para urinar?</Label>
              </div>
              
              <div className="flex items-center space-x-3">
                <Controller
                  name={`entries.${index}.burning`}
                  control={control}
                  render={({ field: controllerField }) => (
                    <Checkbox 
                      id={`entries.${index}.burning`} 
                      checked={controllerField.value} 
                      onCheckedChange={controllerField.onChange} 
                    />
                  )}
                />
                <Label htmlFor={`entries.${index}.burning`} className="font-normal">Sentiu ardência ao urinar?</Label>
              </div>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor={`entries.${index}.lossGrams`}>Perda em gramas (opcional)</Label>
                  <Input 
                    id={`entries.${index}.lossGrams`} 
                    type="number" 
                    step="any" 
                    placeholder="Ex: 50" 
                    {...register(`entries.${index}.lossGrams`)} 
                     className={errors.entries?.[index]?.lossGrams ? "border-destructive" : ""}
                  />
                  {errors.entries?.[index]?.lossGrams && <p className="text-sm text-destructive">{errors.entries?.[index]?.lossGrams?.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`entries.${index}.padChanges`}>Trocas de absorventes (opcional)</Label>
                  <Input 
                    id={`entries.${index}.padChanges`} 
                    type="number" 
                    placeholder="Ex: 3" 
                    {...register(`entries.${index}.padChanges`)} 
                     className={errors.entries?.[index]?.padChanges ? "border-destructive" : ""}
                  />
                  {errors.entries?.[index]?.padChanges && <p className="text-sm text-destructive">{errors.entries?.[index]?.padChanges?.message}</p>}
                </div>
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
          <Button type="button" variant="outline" onClick={() => append(getDefaultUrinaryEntry())} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Outro Registro Urinário
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting || fields.length === 0}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
             Salvar {fields.length > 1 ? `${fields.length} Registros` : 'Registro'}
          </Button>
        </div>
        {errors.entries?.root && <p className="text-sm text-destructive mt-2">{errors.entries.root.message}</p>}
        {errors.entries && !errors.entries.root && errors.entries.length > 0 && (
            <p className="text-sm text-destructive mt-2">Verifique os erros nos registros acima.</p>
        )}
      </form>

      <Card className="mt-8 shadow-lg">
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

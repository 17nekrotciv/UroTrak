// src/app/dashboard/erectile/page.tsx
"use client";

import React, { useState } from 'react';
import { useForm, Controller, type SubmitHandler, useFieldArray } from 'react-hook-form';
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
import { Loader2, HeartPulse, Save, PlusCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/auth-provider';
import { useRouter } from 'next/navigation';

const singleErectileEntrySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida." }),
  erectionQuality: z.string().min(1, { message: "Qualidade da ereção é obrigatória." }),
  medicationUsed: z.enum(['none', 'tadalafil5', 'tadalafil20', 'sildenafil']),
  medicationNotes: z.string().optional(),
});

const erectileFormSchema = z.object({
  entries: z.array(singleErectileEntrySchema).min(1, "Adicione pelo menos um registro."),
});

type ErectileFormInputs = z.infer<typeof erectileFormSchema>;
type SingleErectileEntryInput = z.infer<typeof singleErectileEntrySchema>;

const erectionQualityOptions = [
  { value: "none", label: "Nenhuma ereção" },
  { value: "partial_insufficient", label: "Ereção parcial, insuficiente para penetração" },
  { value: "partial_sufficient", label: "Ereção parcial, suficiente para penetração" },
  { value: "full_not_sustained", label: "Ereção total, mas não mantida" },
  { value: "full_sustained", label: "Ereção total e mantida" },
];

const getDefaultErectileEntry = (): SingleErectileEntryInput => ({
  date: new Date().toISOString(),
  erectionQuality: '',
  medicationUsed: 'none',
  medicationNotes: '',
});

export default function ErectilePage() {
  const { user } = useAuth();
  const { appData, addErectileLog, loadingData } = useData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<ErectileFormInputs>({
    resolver: zodResolver(erectileFormSchema),
    defaultValues: {
      entries: [getDefaultErectileEntry()],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries",
  });

  const onSubmit: SubmitHandler<ErectileFormInputs> = async (data) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para salvar dados.", variant: "destructive" });
      return;
    }

    if (data.entries.length === 0) {
      toast({ title: "Nenhum registro", description: "Adicione pelo menos um registro para salvar.", variant: "default" });
      return;
    }

    setIsSubmitting(true);
    
    const submissionPromises = data.entries.map(entry => {
        const logData: Omit<ErectileLogEntry, 'id' | 'date'> & { date: Date } = {
            ...entry,
            date: new Date(entry.date),
        };
        return addErectileLog(logData).then(() => ({ status: 'fulfilled' as const })).catch(error => ({ status: 'rejected' as const, reason: error }));
    });

    const results = await Promise.all(submissionPromises);
    
    setIsSubmitting(false);

    const successfulSubmissions = results.filter(r => r.status === 'fulfilled').length;
    const failedSubmissions = results.filter(r => r.status === 'rejected');

    if (failedSubmissions.length > 0) {
        const firstError = failedSubmissions[0].reason;
        console.error("Falha ao salvar registros de função erétil:", failedSubmissions.map(f => f.reason));

        let description = "Ocorreu um erro desconhecido ao salvar.";
        if (firstError.code === 'permission-denied') {
            description = "Permissão negada. Verifique se as Regras de Segurança do Firestore foram aplicadas corretamente no Console do Firebase. Esta é a causa mais provável do problema.";
        } else {
            description = `Detalhe do erro: ${firstError.message}`;
        }
        
        let title = "Erro ao Salvar";
        let finalDescription = `Falha ao salvar ${failedSubmissions.length} registro(s). ${description}`;

        if (successfulSubmissions > 0) {
            title = "Parcialmente Salvo";
            finalDescription = `${successfulSubmissions} registro(s) salvo(s). ${finalDescription}`;
        }

        toast({
            title: title,
            description: finalDescription,
            variant: "destructive",
            duration: 10000,
        });
    }

    if (successfulSubmissions > 0) {
        reset({ entries: [getDefaultErectileEntry()] });
        if (failedSubmissions.length === 0) {
            setTimeout(() => router.push('/dashboard/success'), 100);
        }
    }
  };
  
  return (
    <>
      <PageHeader title="Função Erétil" description="Registre informações sobre sua função erétil. Adicione múltiplos registros de uma vez." icon={HeartPulse} />
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {fields.map((field, index) => (
          <Card key={field.id} className="mb-6 shadow-md p-4 relative">
            <CardHeader className="p-2 -mt-2">
              <CardTitle className="font-headline text-lg">Registro de Função Erétil {index + 1}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-2">
              <DatePickerField 
                control={control} 
                name={`entries.${index}.date`} 
                label="Data do Registro" 
                error={errors.entries?.[index]?.date?.message} 
              />

              <div className="space-y-2">
                <Label htmlFor={`entries.${index}.erectionQuality`}>Qualidade da Ereção</Label>
                <Controller
                  name={`entries.${index}.erectionQuality`}
                  control={control}
                  render={({ field: controllerField }) => (
                    <Select 
                      onValueChange={controllerField.onChange} 
                      value={controllerField.value}
                    >
                      <SelectTrigger id={`entries.${index}.erectionQuality`} className={errors.entries?.[index]?.erectionQuality ? "border-destructive" : ""}>
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
                {errors.entries?.[index]?.erectionQuality && <p className="text-sm text-destructive">{errors.entries?.[index]?.erectionQuality?.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Fez uso de medicação?</Label>
                <Controller
                  name={`entries.${index}.medicationUsed`}
                  control={control}
                  render={({ field: controllerField }) => (
                    <RadioGroup
                      onValueChange={controllerField.onChange}
                      value={controllerField.value} 
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-3"><RadioGroupItem value="none" id={`med_none_${index}`} /><Label htmlFor={`med_none_${index}`} className="font-normal">Não usei medicação</Label></div>
                      <div className="flex items-center space-x-3"><RadioGroupItem value="tadalafil5" id={`med_tada5_${index}`} /><Label htmlFor={`med_tada5_${index}`} className="font-normal">Tadalafila 5mg</Label></div>
                      <div className="flex items-center space-x-3"><RadioGroupItem value="tadalafil20" id={`med_tada20_${index}`} /><Label htmlFor={`med_tada20_${index}`} className="font-normal">Tadalafila 20mg</Label></div>
                      <div className="flex items-center space-x-3"><RadioGroupItem value="sildenafil" id={`med_sild_${index}`} /><Label htmlFor={`med_sild_${index}`} className="font-normal">Sildenafila (Viagra)</Label></div>
                    </RadioGroup>
                  )}
                />
                 {errors.entries?.[index]?.medicationUsed && <p className="text-sm text-destructive">{errors.entries?.[index]?.medicationUsed?.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor={`entries.${index}.medicationNotes`}>Notas sobre a medicação (opcional)</Label>
                <Textarea 
                  id={`entries.${index}.medicationNotes`} 
                  placeholder="Ex: Efeito, duração, etc." 
                  {...register(`entries.${index}.medicationNotes`)} 
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
          <Button type="button" variant="outline" onClick={() => append(getDefaultErectileEntry())} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Adicionar Outro Registro de Função Erétil
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

"use client";

import React, { useState, useRef } from 'react';
import { useForm, Controller, type SubmitHandler, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import PageHeader from '@/components/ui/PageHeader';
import { DatePickerField } from '@/components/forms/FormParts';
import { useData } from '@/contexts/data-provider';
import type { ErectileLogEntry } from '@/types';
import { Loader2, HeartPulse, Save, PlusCircle, Trash2, Edit, XCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from '@/contexts/auth-provider';
import { useRouter } from 'next/navigation';

const singleErectileEntrySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida." }),
  erectionQuality: z.string().min(1, { message: "Qualidade da ereção é obrigatória." }),
  medicationUsed: z.array(z.string()).optional(),
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

const medicationOptions = [
  { id: 'tadalafil5', label: 'Tadalafila (Cialis) 5mg' },
  { id: 'tadalafil20', label: 'Tadalafila (Cialis) 20mg' },
  { id: 'sildenafil', label: 'Sildenafila (Viagra) 50mg' },
];

const getDefaultErectileEntry = (): SingleErectileEntryInput => ({
  date: new Date().toISOString(),
  erectionQuality: '',
  medicationUsed: [],
  medicationNotes: '',
});

export default function ErectilePage() {
  const { user } = useAuth();
  const { appData, addErectileLog, updateErectileLog, deleteErectileLog, loadingData } = useData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);


  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<ErectileFormInputs>({
    resolver: zodResolver(erectileFormSchema),
    defaultValues: {
      entries: [getDefaultErectileEntry()],
    },
  });

  const { fields } = useFieldArray({
    control,
    name: "entries",
  });

  const watchedDate = useWatch({
    control,
    name: `entries.0.date`,
  });

  const handleDeleteClick = async (log: ErectileLogEntry) => {
    if (!log || !log.id) return;

    try {
      await deleteErectileLog(log.id);
      toast({
        title: "✅ Registro Deletado",
        description: "O registro foi deletado com sucesso.",
      });
      if (editingLogId === log.id) {
        handleCancelEdit();
      }
    } catch (error: any) {
      toast({
        title: "❌ Erro ao Deletar",
        description: `Ocorreu um erro: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleStartEdit = (log: ErectileLogEntry) => {
    if (!log.id) return;
    setEditingLogId(log.id);
    const entryToEdit = {
      ...log,
      date: new Date(log.date).toISOString(),
      medicationUsed: Array.isArray(log.medicationUsed) ? log.medicationUsed : (typeof log.medicationUsed === 'string' && log.medicationUsed !== 'none' ? [log.medicationUsed] : [])
    };
    reset({ entries: [entryToEdit] });
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
    toast({ title: "Modo de Edição", description: `Você está editando o registro do dia ${format(new Date(log.date), "dd/MM/yyyy")}.` });
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    reset({ entries: [getDefaultErectileEntry()] });
    toast({ title: "Edição Cancelada", description: "O formulário foi restaurado para adicionar um novo registro." });
  };

  const onSubmit: SubmitHandler<ErectileFormInputs> = async (data) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para salvar dados.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const entryData = data.entries[0];

    try {
      if (editingLogId) {
        // Lógica de atualização
        await updateErectileLog(editingLogId, {
          ...entryData,
          date: new Date(entryData.date),
          medicationUsed: entryData.medicationUsed ?? [],
        });
        toast({ title: "Sucesso", description: "O registro foi atualizado com sucesso." });
        setEditingLogId(null);
        reset({ entries: [getDefaultErectileEntry()] });
      } else {
        // Lógica de criação
        const existingEntry = appData.erectileLogs.find(log =>
          isSameDay(parseISO(log.date), new Date(entryData.date))
        );

        if (existingEntry) {
          toast({
            title: "Registro Duplicado",
            description: "Já existe um registro para esta data. Deseja editá-lo?",
            variant: "destructive",
            action: <ToastAction altText="Editar" onClick={() => handleStartEdit(existingEntry)}>Editar</ToastAction>,
          });
          setIsSubmitting(false);
          return;
        }

        await addErectileLog({
          ...entryData,
          date: new Date(entryData.date),
          medicationUsed: entryData.medicationUsed ?? [],
        });
        toast({ title: "Sucesso", description: "Novo registro salvo com sucesso." });
        reset({ entries: [getDefaultErectileEntry()] });
      }
    } catch (error: any) {
      console.error("Falha ao salvar registro:", error);
      let description = "Ocorreu um erro desconhecido ao salvar.";
      if (error.code === 'permission-denied') {
        description = "Permissão negada. Verifique suas regras de segurança do Firestore.";
      } else {
        description = `Detalhe do erro: ${error.message}`;
      }
      toast({ title: "Erro ao Salvar", description, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <PageHeader title="Função Erétil" description="Registre ou edite informações sobre sua função erétil." icon={HeartPulse} />

      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {fields.slice(0, 1).map((field, index) => (
          <Card key={field.id} className="mb-6 shadow-md p-4 relative">
            <CardHeader className="p-2 -mt-2">
              <CardTitle className="font-headline text-lg">
                {editingLogId ? `Editando Registro de Função Erétil` : 'Novo Registro de Função Erétil'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-2">
              {/* CORREÇÃO: Renderização condicional para bloquear a data */}
              <div className="space-y-2">
                <Label>Data do Registro</Label>
                {editingLogId ? (
                  <div className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground">
                    {watchedDate ? format(new Date(watchedDate), 'dd/MM/yyyy') : 'N/A'}
                  </div>
                ) : (
                  <DatePickerField
                    control={control}
                    name={`entries.${index}.date`}
                    label="" // Label já está acima
                    error={errors.entries?.[index]?.date?.message}
                  />
                )}
              </div>

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
                  render={({ field }) => (
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          id={`med_none_${index}`}
                          checked={!field.value || field.value.length === 0}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              field.onChange([]);
                            }
                          }}
                        />
                        <Label htmlFor={`med_none_${index}`} className="font-normal">
                          Não usei medicação
                        </Label>
                      </div>
                      <div className="relative py-2">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-card px-2 text-muted-foreground">Ou</span>
                        </div>
                      </div>
                      {medicationOptions.map((option) => (
                        <div key={option.id} className="flex items-center space-x-3">
                          <Checkbox
                            id={`med_${option.id}_${index}`}
                            checked={field.value?.includes(option.id)}
                            onCheckedChange={(checked) => {
                              const currentValues = field.value || [];
                              const newValues = checked
                                ? [...currentValues, option.id]
                                : currentValues.filter((value) => value !== option.id);
                              field.onChange(newValues);
                            }}
                          />
                          <Label htmlFor={`med_${option.id}_${index}`} className="font-normal">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
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
            </CardContent>
          </Card>
        ))}

        <div className="flex flex-col sm:flex-row gap-4">
          <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {editingLogId ? 'Salvar Alterações' : 'Salvar Novo Registro'}
          </Button>
          {editingLogId && (
            <Button type="button" variant="outline" onClick={handleCancelEdit} className="w-full sm:w-auto">
              <XCircle className="mr-2 h-4 w-4" />
              Cancelar Edição
            </Button>
          )}
        </div>
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
                  <li key={log.id} className="p-3 bg-secondary/30 rounded-md text-sm flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{format(new Date(log.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      <p>Qualidade: {erectionQualityOptions.find(opt => opt.value === log.erectionQuality)?.label || log.erectionQuality}</p>
                      <p>Medicação:
                        {(() => {
                          const medUsed = log.medicationUsed as any;

                          if (Array.isArray(medUsed)) {
                            if (medUsed.length > 0) {
                              return medUsed
                                .map((medId: string) => medicationOptions.find(opt => opt.id === medId)?.label)
                                .join(', ');
                            }
                          } else if (typeof medUsed === 'string' && medUsed !== 'none') {
                            return medicationOptions.find(opt => opt.id === medUsed)?.label || 'Nenhuma';
                          }
                          return 'Nenhuma';
                        })()}
                      </p>
                      {log.medicationNotes && <p>Notas: {log.medicationNotes}</p>}
                    </div>
                    <div className='flex items-center gap-1'>
                      <Button variant="ghost" size="sm" onClick={() => handleStartEdit(log)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </Button>
                      <ConfirmationDialog
                        title="Você tem certeza?"
                        description={`Esta ação excluirá permanentemente o registro do dia ${format(new Date(log.date), 'dd/MM/yyyy')}.`}
                        onConfirm={() => handleDeleteClick(log)}
                        confirmText="Deletar"
                      >
                        {/* O que vai aqui dentro é o botão que abre o diálogo */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Deletar</span>
                        </Button>
                      </ConfirmationDialog>
                    </div>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </CardContent>
      </Card >
    </>
  );
}

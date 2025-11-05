"use client";

import React, { useState, useRef } from 'react';
import { useForm, Controller, type SubmitHandler, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import PageHeader from '@/components/ui/PageHeader';
import { DatePickerField } from '@/components/forms/FormParts';
import { useData } from '@/contexts/data-provider';
import type { UrinaryLogEntry } from '@/types';
import { Loader2, Droplets, Save, Edit, XCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";
import { useAuth } from '@/contexts/auth-provider';
import { useRouter } from 'next/navigation';
import { Textarea } from '@/components/ui/textarea';

// Schema para uma única entrada urinária
const singleUrinaryEntrySchema = z.object({
  date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida." }),
  urgency: z.boolean().default(false),
  burning: z.boolean().default(false),
  physiotherapyExercise: z.boolean().default(false),
  lossGrams: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
    z.number().min(0, "Deve ser zero ou maior").nullable().optional()
  ),
  padChanges: z.preprocess(
    (val) => (val === "" || val === undefined || val === null ? null : Number(val)),
    z.number().int("Deve ser um número inteiro").min(0, "Deve ser zero ou maior").nullable().optional()
  ),
  medicationNotes: z.string().optional()
});

// Schema do formulário principal
const urinaryFormSchema = z.object({
  entries: z.array(singleUrinaryEntrySchema).min(1, "Adicione pelo menos um registro."),
});

type UrinaryFormInputs = z.infer<typeof urinaryFormSchema>;
type SingleUrinaryEntryInput = z.infer<typeof singleUrinaryEntrySchema>;

// Função para obter uma entrada urinária padrão
const getDefaultUrinaryEntry = (): SingleUrinaryEntryInput => ({
  date: new Date().toISOString(),
  urgency: false,
  burning: false,
  physiotherapyExercise: false,
  lossGrams: null,
  padChanges: null,
  medicationNotes: ``
});

export default function UrinaryPage() {
  const { user } = useAuth();
  const { appData, addUrinaryLog, updateUrinaryLog, deleteUrinaryLog, loadingData } = useData();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const { control, register, handleSubmit, reset, formState: { errors } } = useForm<UrinaryFormInputs>({
    resolver: zodResolver(urinaryFormSchema),
    defaultValues: {
      entries: [getDefaultUrinaryEntry()],
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


  // Esta função é chamada quando o usuário confirma no AlertDialog.
  const handleDeleteClick = async (log: UrinaryLogEntry) => {
    if (!log || !log.id) return;

    try {
      await deleteUrinaryLog(log.id);
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

  const handleStartEdit = (log: UrinaryLogEntry) => {
    if (!log.id) return;
    setEditingLogId(log.id);
    const entryToEdit = {
      ...log,
      date: new Date(log.date).toISOString(),
    };
    reset({ entries: [entryToEdit] });
    formRef.current?.scrollIntoView({ behavior: 'smooth' });
    toast({ title: "Modo de Edição", description: `Você está editando o registro do dia ${format(new Date(log.date), "dd/MM/yyyy")}.` });
  };

  const handleCancelEdit = () => {
    setEditingLogId(null);
    reset({ entries: [getDefaultUrinaryEntry()] });
    toast({ title: "Edição Cancelada", description: "O formulário foi restaurado para adicionar um novo registro." });
  };

  const onSubmit: SubmitHandler<UrinaryFormInputs> = async (data) => {
    if (!user) {
      toast({ title: "Erro de Autenticação", description: "Você precisa estar logado para salvar dados.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    const entryData = data.entries[0];

    try {
      if (editingLogId) {
        // Lógica de atualização
        await updateUrinaryLog(editingLogId, {
          ...entryData,
          date: new Date(entryData.date),
          lossGrams: entryData.lossGrams ?? null,
          padChanges: entryData.padChanges ?? null,
        });
        toast({ title: "Sucesso", description: "O registro foi atualizado com sucesso." });
        setEditingLogId(null);
        reset({ entries: [getDefaultUrinaryEntry()] });
      } else {
        // Lógica de criação
        const existingEntry = appData.urinaryLogs.find(log =>
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

        await addUrinaryLog({
          ...entryData,
          date: new Date(entryData.date),
          lossGrams: entryData.lossGrams ?? null,
          padChanges: entryData.padChanges ?? null,
        });
        toast({ title: "Sucesso", description: "Novo registro salvo com sucesso." });
        reset({ entries: [getDefaultUrinaryEntry()] });
      }
    } catch (error: any) {
      console.error("Falha ao salvar registro urinário:", error);
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

  const BooleanRadioGroup = ({ control, name, label, error }: { control: any, name: string, label: string, error?: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <RadioGroup
            onValueChange={(value) => field.onChange(value === 'true')}
            value={String(field.value)}
            className="flex items-center space-x-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id={`${name}-yes`} />
              <Label htmlFor={`${name}-yes`} className="font-normal">Sim</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id={`${name}-no`} />
              <Label htmlFor={`${name}-no`} className="font-normal">Não</Label>
            </div>
          </RadioGroup>
        )}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );

  return (
    <>
      <PageHeader title="Sintomas Urinários" description="Registre ou edite seus sintomas urinários." icon={Droplets} />

      <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {fields.slice(0, 1).map((field, index) => (
          <Card key={field.id} className="mb-6 shadow-md p-4 relative">
            <CardHeader className="p-2 -mt-2">
              <CardTitle className="font-headline text-lg">
                {editingLogId ? 'Editando Registro Urinário' : 'Novo Registro Urinário'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-2">
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
                    label=""
                    error={errors.entries?.[index]?.date?.message}
                  />
                )}
              </div>

              <BooleanRadioGroup
                control={control}
                name={`entries.${index}.urgency`}
                label="Sentiu urgência para urinar?"
                error={errors.entries?.[index]?.urgency?.message}
              />

              <BooleanRadioGroup
                control={control}
                name={`entries.${index}.burning`}
                label="Sentiu ardência ao urinar?"
                error={errors.entries?.[index]?.burning?.message}
              />

              <BooleanRadioGroup
                control={control}
                name={`entries.${index}.physiotherapyExercise`}
                label="Fez exercício de fisioterapia urinária?"
                error={errors.entries?.[index]?.physiotherapyExercise?.message}
              />

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
                  <Label htmlFor={`entries.${index}.padChanges`}>Trocas de absorventes por dia (opcional)</Label>
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
        {errors.entries?.root && <p className="text-sm text-destructive mt-2">{errors.entries.root.message}</p>}
        {errors.entries && !errors.entries.root && (errors.entries?.length ?? 0) > 0 && (
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
                  <li key={log.id} className="p-3 bg-secondary/30 rounded-md text-sm flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{format(new Date(log.date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                      <p>Urgência: {log.urgency ? 'Sim' : 'Não'}</p>
                      <p>Ardência: {log.burning ? 'Sim' : 'Não'}</p>
                      <p>Fez Fisioterapia: {log.physiotherapyExercise ? 'Sim' : 'Não'}</p>
                      {log.lossGrams !== null && <p>Perda: {log.lossGrams}g</p>}
                      {log.padChanges !== null && <p>Trocas de absorventes: {log.padChanges}</p>}
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
      </Card>
    </>
  );
}

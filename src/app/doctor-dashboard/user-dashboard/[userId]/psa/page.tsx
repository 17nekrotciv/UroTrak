"use client";

import React, { useState, useRef, useEffect, use } from 'react';
import { useForm, type SubmitHandler, useFieldArray, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import PageHeader from '@/components/ui/PageHeader';
import { DatePickerField } from '@/components/forms/FormParts';
import { useData } from '@/contexts/data-provider';
import type { PSALogEntry } from '@/types';
import { Loader2, ClipboardList, Save, Edit, XCircle, Trash2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from "@/components/ui/toast";

// O schema e os tipos permanecem os mesmos
const singlePsaEntrySchema = z.object({
    date: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Data inválida." }),
    psaValue: z.preprocess(
        (val) => (val === "" || val === undefined || val === null ? null : Number(String(val).replace(',', '.'))),
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

// Renomeando o componente para refletir sua nova função
export default function UserPSAManagementPage({ params }: { params: Promise<{ userId: string }> }) {
    const {
        viewedUserData,
        loadingViewedUser,
        loadViewedUserData,
        viewedUserProfile,
        addPSALog,
        updatePSALog,
        deletePSALog
    } = useData();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingLogId, setEditingLogId] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // Resolvendo os parâmetros da URL
    const resolvedParams = use(params);
    const { userId } = resolvedParams;

    // useEffect para carregar os dados do usuário específico
    useEffect(() => {
        if (userId) {
            const unsubscribe = loadViewedUserData(userId);
            return () => unsubscribe();
        }
    }, [userId, loadViewedUserData]);

    const { control, register, handleSubmit, reset, formState: { errors } } = useForm<PSAFormInputs>({
        resolver: zodResolver(psaFormSchema),
        defaultValues: {
            entries: [getDefaultPSAEntry()],
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

    const handleDeleteClick = async (log: PSALogEntry) => {
        if (!log || !log.id) return;
        try {
            // Passando o userId para a função de deletar
            await deletePSALog(log.id, userId);
            toast({
                title: "✅ Registro Deletado",
                description: "O registro do usuário foi deletado com sucesso.",
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

    const handleStartEdit = (log: PSALogEntry) => {
        if (!log.id) return;
        setEditingLogId(log.id);
        const entryToEdit = {
            ...log,
            date: new Date(log.date).toISOString(),
        };
        reset({ entries: [entryToEdit] });
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
        toast({ title: "Modo de Edição", description: `Editando resultado de ${format(new Date(log.date), "dd/MM/yyyy")}.` });
    };

    const handleCancelEdit = () => {
        setEditingLogId(null);
        reset({ entries: [getDefaultPSAEntry()] });
        toast({ title: "Edição Cancelada" });
    };

    const onSubmit: SubmitHandler<PSAFormInputs> = async (data) => {
        if (!userId) {
            toast({ title: "Erro", description: "ID do usuário não encontrado.", variant: "destructive" });
            return;
        }
        if (!viewedUserData) {
            toast({ title: "Erro de Dados", description: "Os dados do usuário ainda não foram carregados.", variant: "destructive" });
            setIsSubmitting(false);
            return;
        }

        setIsSubmitting(true);
        const entryData = data.entries[0];

        try {
            if (editingLogId) {
                await updatePSALog(editingLogId, {
                    ...entryData,
                    date: new Date(entryData.date),
                    psaValue: entryData.psaValue ?? null,
                }, userId); // Passando userId
                toast({ title: "Sucesso", description: "O registro do usuário foi atualizado." });
                setEditingLogId(null);
                reset({ entries: [getDefaultPSAEntry()] });
            } else {
                // Usando viewedUserData para checar duplicados
                const existingEntry = viewedUserData.psaLogs.find(log =>
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

                await addPSALog({
                    ...entryData,
                    date: new Date(entryData.date),
                    psaValue: entryData.psaValue ?? null,
                }, userId); // Passando userId
                toast({ title: "Sucesso", description: "Novo registro salvo para o usuário." });
                reset({ entries: [getDefaultPSAEntry()] });
            }
        } catch (error: any) {
            console.error("Falha ao salvar resultado de PSA:", error);
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
    
    // Estado de carregamento global
    if (loadingViewedUser || !viewedUserData) {
        return (
            <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg font-semibold text-foreground">Carregando dados do usuário...</p>
            </div>
        );
    }

    return (
        <>
            <PageHeader
                title={`Gerenciar PSA de ${viewedUserProfile?.displayName || 'Usuário'}`}
                description="Adicione, edite ou remova resultados de exames PSA para este usuário."
                icon={ClipboardList}
            />

            <form ref={formRef} onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* O formulário permanece o mesmo */}
                {fields.slice(0, 1).map((field, index) => (
                    <Card key={field.id} className="mb-6 shadow-md p-4 relative">
                        <CardHeader className="p-2 -mt-2">
                            <CardTitle className="font-headline text-lg">
                                {editingLogId ? 'Editando Resultado PSA' : 'Novo Resultado PSA'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 p-2">
                            <div className="space-y-2">
                                <Label>Data do Exame</Label>
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
                            <div className="space-y-2">
                                <Label htmlFor={`entries.${index}.psaValue`}>Valor do PSA (ng/mL)</Label>
                                <Input
                                    id={`entries.${index}.psaValue`}
                                    type="text" // Usar text para melhor experiência com decimais
                                    inputMode="decimal"
                                    placeholder="Ex: 0.05"
                                    {...register(`entries.${index}.psaValue`)}
                                    className={errors.entries?.[index]?.psaValue ? "border-destructive" : ""}
                                />
                                {errors.entries?.[index]?.psaValue && <p className="text-sm text-destructive">{errors.entries?.[index]?.psaValue?.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`entries.${index}.notes`}>Notas (opcional)</Label>
                                <Textarea
                                    id={`entries.${index}.notes`}
                                    placeholder="Ex: Laboratório, observações, etc."
                                    {...register(`entries.${index}.notes`)}
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
                    <CardTitle className="font-headline text-xl">Histórico do Usuário</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* Usando viewedUserData para exibir a lista */}
                    {viewedUserData.psaLogs.length === 0 ? (
                        <p className="text-muted-foreground">Nenhum registro encontrado para este usuário.</p>
                    ) : (
                        <ScrollArea className="h-[300px] w-full rounded-md border p-4">
                            <ul className="space-y-4">
                                {viewedUserData.psaLogs.map((log) => (
                                    <li key={log.id} className="p-3 bg-secondary/30 rounded-md text-sm flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">{format(new Date(log.date), "dd/MM/yyyy", { locale: ptBR })}</p>
                                            {log.psaValue !== null && <p>PSA: {log.psaValue.toFixed(2)} ng/mL</p>}
                                            {log.notes && <p>Notas: {log.notes}</p>}
                                        </div>
                                        <div className='flex items-center gap-1'>
                                            <Button variant="ghost" size="sm" onClick={() => handleStartEdit(log)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                Editar
                                            </Button>
                                            <ConfirmationDialog
                                                title="Você tem certeza?"
                                                description={`Esta ação excluirá permanentemente o registro de ${format(new Date(log.date), 'dd/MM/yyyy')}.`}
                                                onConfirm={() => handleDeleteClick(log)}
                                                confirmText="Deletar"
                                            >
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
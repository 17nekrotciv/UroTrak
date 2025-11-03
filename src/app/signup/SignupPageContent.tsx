// src/app/signup/page.tsx
"use client";


// ✅ 1. Importar useState, useCallback
import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
// ✅ 2. Importar o 'app' do firebase e as 'functions'
import { auth, app } from '@/lib/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import AuthLayout from '@/components/auth/AuthLayout';

// ✅ 3. Manter ícones e Dialog
import { Loader2, UserPlus, ArrowLeft, ArrowRight, User, Stethoscope } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IMaskInput } from 'react-imask';
// ✅ 4. REMOVER 'useCepAutocomplete' - A lógica será local
// import { useCepAutocomplete } from '@/hooks/use-cep-autocomplete';
import { cn } from '@/lib/utils';
import { useData } from '@/contexts/data-provider';


// --- ✅ 5. SCHEMAS ATUALIZADOS PARA BATER COM A CLOUD FUNCTION ---
const step1Schema = z.object({
    displayName: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
    email: z.string().email({ message: "Email inválido." }),
    password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
    role: z.enum(['doctor', 'user'], { required_error: "O tipo de conta é obrigatório." }),
});

// ✅ 6. step2Schema atualizado com 'address' aninhado e 'zipCode'
const step2Schema = z.object({
    cpf: z.string().length(11, { message: "CPF deve ter 11 dígitos." }),
    phone: z.string().min(10, { message: "Telefone inválido." }),
    birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Data de nascimento inválida." }),
    gender: z.enum(['Masculino', 'Feminino']),
    address: z.object({
        zipCode: z.string().length(8, { message: "CEP deve ter 8 dígitos." }),
        street: z.string().min(3, { message: "A rua é obrigatória." }),
        number: z.string().min(1, { message: "O número é obrigatório." }),
        complement: z.string().optional(),
        neighborhood: z.string().min(3, { message: "O bairro é obrigatório." }),
        city: z.string().min(3, { message: "A cidade é obrigatória." }),
        state: z.string().length(2, { message: "O estado é obrigatório." }),
    }),
    clinicId: z.string().optional()
});

// Campos de médico (step3) permanecem opcionais no schema base
const step3Schema = z.object({
    crm: z.string().optional(),
    especializacao: z.string().optional(),
    rqe: z.string().optional(),
    clinicName: z.string().optional(),
    clinicCnpj: z.string().optional(),
});

// ✅ 7. Schema final (mesma lógica de antes, mas agora com 'address' aninhado)
const signupSchema = step1Schema.merge(step2Schema).merge(step3Schema).refine(
    (data) => {
        // Se for médico, o CRM é OBRIGATÓRIO (como na Cloud Function)
        if (data.role === 'doctor') {
            return !!data.crm && data.crm.length >= 3;
        }
        return true; // Se for paciente, ignora
    },
    {
        message: "CRM é obrigatório para médicos.",
        path: ["crm"],
    }
).refine(
    (data) => {
        // Manter validação de CNPJ (14 dígitos numéricos) no frontend
        if (data.role === 'doctor') {
            if (!data.clinicCnpj || data.clinicCnpj.length === 0) {
                return true; // CNPJ é opcional
            }
            return data.clinicCnpj.length === 14;
        }
        return true;
    },
    {
        message: "CNPJ deve ter 14 números.",
        path: ["clinicCnpj"],
    }
);


type SignupFormInputs = z.infer<typeof signupSchema>;

export default function SignupPage() {
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1);
    const [roleSelected, setRoleSelected] = useState<'doctor' | 'user' | null>(null);

    const router = useRouter();
    const { toast } = useToast();
    const { allClinics, loadingClinics } = useData();
    const searchParams = useSearchParams();

    const [clinicIdFromUrl, setClinicIdFromUrl] = useState<string | null>(null);
    const [clinicNameFromUrl, setClinicNameFromUrl] = useState<string | null>(null);

    const { register, handleSubmit, formState: { errors }, trigger, control, setValue, setFocus, watch } = useForm<SignupFormInputs>({
        resolver: zodResolver(signupSchema),
        mode: "onBlur"
    });

    const role = watch("role");

    // ✅ 8. Lógica do CEP movida para dentro do componente
    const [isCepLoading, setIsCepLoading] = useState(false);
    const handleCepSearch = useCallback(async (cep: string) => {
        if (cep.length !== 8) return;
        setIsCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();
            if (data.erro) {
                toast({ title: "CEP não encontrado", variant: "destructive" });
                return;
            }
            // Atualiza os campos aninhados 'address'
            setValue('address.street', data.logradouro);
            setValue('address.neighborhood', data.bairro);
            setValue('address.city', data.localidade);
            setValue('address.state', data.uf);
            setFocus('address.number');
        } catch (error) {
            toast({ title: "Erro ao buscar CEP", description: "Verifique sua conexão.", variant: "destructive" });
        } finally {
            setIsCepLoading(false);
        }
    }, [setValue, setFocus, toast]);


    const onSignupSuccess = (userRole: 'doctor' | 'user') => {
        toast({ title: "Cadastro realizado com sucesso!", description: "Você será redirecionado para o painel." });
        if (userRole === 'doctor') {
            router.push('/doctor-dashboard');
        } else {
            router.push('/dashboard');
        }
    };

    // ✅ 9. onSignupError atualizado para tratar erros da Cloud Function
    const onSignupError = (error: any) => {
        console.error(`Signup error:`, error);
        let errorMessage = `Ocorreu um erro ao tentar criar a conta. Tente novamente.`;

        // Erros da Cloud Function (vem com 'code' e 'message')
        if (error.code && error.message) {
            switch (error.code) {
                // Erros do Firebase Auth
                case 'auth/email-already-in-use':
                    errorMessage = "Este email já está cadastrado. Tente fazer login ou use um email diferente.";
                    break;
                // Erros da HttpsError (Cloud Function)
                case 'already-exists':
                case 'invalid-argument':
                    errorMessage = error.message; // Ex: "O CPF informado já está cadastrado."
                    break;
                case 'permission-denied':
                    errorMessage = "Falha ao salvar dados: permissão negada.";
                    break;
                default:
                    errorMessage = `Erro no cadastro (${error.code}): ${error.message || 'Tente novamente.'}`;
            }
        } else if (error && typeof error === 'object' && 'message' in error) {
            errorMessage = (error as { message: string }).message;
        }

        toast({ title: "Erro no Cadastro", description: errorMessage, variant: "destructive" });
    };

    // ✅ 10. handleNextStep atualizado para validar os campos aninhados
    const handleNextStep = async () => {
        let fieldsToValidate: (keyof SignupFormInputs)[] = [];
        if (step === 1) {
            fieldsToValidate = ["displayName", "email", "password", "role"];
        } else if (step === 2) {
            // Validar os campos da Etapa 2, incluindo o objeto 'address'
            fieldsToValidate = ["cpf", "phone", "birthDate", "gender", "address", "clinicId"]
        }

        const isValid = await trigger(fieldsToValidate);
        if (isValid) {
            if (step === 1) {
                setStep(2);
            } else if (step === 2) {
                if (role === 'doctor') {
                    setStep(3);
                } else {
                    handleSubmit(onSubmit)();
                }
            }
        }
    };

    // ✅ 11. onSubmit TOTALMENTE REFEITO para usar a Cloud Function
    const onSubmit: SubmitHandler<SignupFormInputs> = async (data) => {
        setLoading(true);
        try {
            // Etapa 1: Criar o usuário no Firebase Auth (cliente)
            const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
            const user = userCredential.user;

            // Atualizar o perfil do Auth (displayNamyye)
            await updateProfile(user, { displayName: data.displayName });

            // Etapa 2: Chamar a Cloud Function 'completeUserRegistration'
            const functions = getFunctions(app); // 'app' importado de @/lib/firebase
            const completeUserRegistration = httpsCallable(functions, 'completeUserRegistration');

            // Os 'dados' do formulário (SignupFormInputs) já correspondem à interface 'SignupData' da função
            // A função será executada com o 'auth' do usuário recém-criado
            await completeUserRegistration(data);

            // Etapa 3: Sucesso
            onSignupSuccess(data.role);

        } catch (error: any) {
            // Etapa 4: Tratamento de erro

            // Se a Cloud Function falhar (ex: CPF duplicado), o usuário do Auth foi criado
            // mas o do Firestore não. Devemos deletar o usuário do Auth para permitir nova tentativa.
            const currentUser = auth.currentUser;
            if (currentUser && error.code !== 'auth/email-already-in-use') {
                try {
                    await currentUser.delete();
                    console.log("Criação do usuário no Auth revertida com sucesso.");
                } catch (delError) {
                    console.error("Falha crítica ao reverter usuário do Auth:", delError);
                    // Se a reversão falhar, o usuário está em estado inconsistente.
                    onSignupError({
                        message: "Ocorreu um erro e sua conta não pôde ser criada. O email pode já estar em uso. Contate o suporte."
                    });
                    setLoading(false);
                    return;
                }
            }

            onSignupError(error); // Exibe o erro (ex: "CPF já cadastrado")
        } finally {
            setLoading(false);
        }
    };


    const handleRoleSelect = (selectedRole: 'doctor' | 'user') => {
        setValue('role', selectedRole);
        setRoleSelected(selectedRole);
    };

    useEffect(() => {
        const inviteId = searchParams.get('invite');
        const clinicIdParam = searchParams.get('clinic');

        if (clinicIdParam && !loadingClinics && allClinics.length > 0) {
            // Encontramos um ID de clínica na URL
            const clinic = allClinics.find(c => c.id === clinicIdParam);

            if (clinic) {
                // É um convite válido de paciente
                handleRoleSelect('user'); // Força o papel para "paciente" (pula o modal)
                setValue('clinicId', clinic.id); // Define o valor no formulário
                setClinicIdFromUrl(clinic.id ?? null); // Guarda o ID para desativar o campo
                setClinicNameFromUrl(clinic.name); // Guarda o nome para exibir
            }
        }
    }, [searchParams, allClinics, loadingClinics, setValue]); // Dependências


    return (
        <AuthLayout title="Cadastro">

            {/* Modal de Seleção de Tipo de Conta (não muda) */}
            <Dialog open={roleSelected === null}>
                <DialogContent
                    className="sm:max-w-md"
                >
                    <DialogHeader>
                        <DialogTitle className="text-center text-2xl">Primeiro Passo</DialogTitle>
                        <DialogDescription className="text-center pt-2">
                            Como você usará o UroTrack?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <Button
                            variant="outline"
                            className="h-24 flex-col gap-2"
                            onClick={() => handleRoleSelect('user')}
                        >
                            <User className="h-8 w-8 text-primary" />
                            <span className="text-base">Sou Paciente</span>
                        </Button>
                        <Button
                            variant="outline"
                            className="h-24 flex-col gap-2"
                            onClick={() => handleRoleSelect('doctor')}
                        >
                            <Stethoscope className="h-8 w-8 text-primary" />
                            <span className="text-base">Sou Médico</span>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Renderiza o formulário se um 'role' foi selecionado (manualmente ou pela URL) */}
            {roleSelected && (
                <>
                    <div className="mb-4 text-center text-sm text-gray-600">
                        Etapa {step} de {role === 'doctor' ? 3 : 2}
                    </div>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                        {/* --- ETAPA 1 (Dados de Login) --- */}
                        {step === 1 && (
                            <>
                                <h3 className="font-semibold text-center">
                                    Cadastro de: <span className="text-primary">{roleSelected === 'doctor' ? 'Médico' : 'Paciente'}</span>
                                </h3>
                                <div className="space-y-2">
                                    <Label htmlFor="displayName">Nome Completo</Label>
                                    <Input id="displayName" {...register("displayName")} disabled={loading} />
                                    {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input id="email" type="email" {...register("email")} disabled={loading} />
                                    {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password">Senha</Label>
                                    <Input id="password" type="password" {...register("password")} disabled={loading} />
                                    {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                                </div>
                                <Button type="button" onClick={handleNextStep} className="w-full font-semibold" disabled={loading}>
                                    Próximo <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </>
                        )}

                        {/* --- ETAPA 2 (Dados Pessoais e Endereço) --- */}
                        {step === 2 && (
                            <>
                                <h3 className="font-semibold text-center">Dados Pessoais</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Controller name="cpf" control={control} render={({ field }) => (<div><Label>CPF *</Label><IMaskInput mask="000.000.000-00" unmask={true} onAccept={field.onChange} value={field.value || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" disabled={loading} />{errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}</div>)} />
                                    <Controller name="phone" control={control} render={({ field }) => (<div><Label>Telefone *</Label><IMaskInput mask="(00) 00000-0000" unmask={true} onAccept={field.onChange} value={field.value || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" disabled={loading} />{errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}</div>)} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Controller name="birthDate" control={control} render={({ field }) => (<div><Label>Data de Nascimento *</Label><Input type="date" {...field} disabled={loading} />{errors.birthDate && <p className="text-sm text-destructive">{errors.birthDate.message}</p>}</div>)} />
                                    <Controller name="gender" control={control} render={({ field }) => (<div><Label>Gênero *</Label><Select onValueChange={field.onChange} value={field.value} disabled={loading}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Feminino">Feminino</SelectItem></SelectContent></Select>{errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}</div>)} />
                                </div>

                                {/* --- ❗ CAMPO DE CLÍNICA ATUALIZADO ❗ --- */}
                                {role === 'user' && (
                                    <div className="space-y-2">
                                        {/* A label agora é "Médico ou Clínica" (sem opcional, pois é preenchido ou selecionável) */}
                                        <Label htmlFor="clinicId">Médico ou Clínica</Label>
                                        <Controller
                                            name="clinicId"
                                            control={control}
                                            render={({ field }) => (
                                                <>
                                                    {/* SE VEIO DA URL, MOSTRA UM CAMPO DESATIVADO */}
                                                    {clinicIdFromUrl ? (
                                                        <div
                                                            className="flex h-10 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                                                        >
                                                            {/* Mostra o nome da clínica que veio do convite */}
                                                            {clinicNameFromUrl || "Carregando clínica..."}
                                                        </div>
                                                    ) : (
                                                        /* SE NÃO VEIO DA URL, MOSTRA O DROPDOWN NORMAL */
                                                        <Select
                                                            onValueChange={field.onChange}
                                                            value={field.value || ''} // Garante que o valor não seja null
                                                            disabled={loading || loadingClinics}
                                                        >
                                                            <SelectTrigger id="clinicId">
                                                                <SelectValue
                                                                    placeholder={
                                                                        loadingClinics ? "Carregando médicos..." :
                                                                            "Selecione (opcional)"
                                                                    }
                                                                />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {allClinics.map((clinic) => (
                                                                    <SelectItem key={clinic.id} value={clinic.id!}>
                                                                        {clinic.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    )}
                                                </>
                                            )}
                                        />
                                        {errors.clinicId && <p className="text-sm text-destructive">{errors.clinicId.message}</p>}
                                    </div>
                                )}
                                {/* --- FIM DO CAMPO DE CLÍNICA --- */}

                                {/* Campos de Endereço */}
                                <Controller name="address.zipCode" control={control} render={({ field }) => (<div><Label>CEP *</Label><div className='relative'><IMaskInput mask="00000-000" unmask={true} onAccept={(v) => { field.onChange(v); if (v.length === 8) handleCepSearch(v); }} value={field.value || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" disabled={loading || isCepLoading} />{isCepLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />}</div>{errors.address?.zipCode && <p className="text-sm text-destructive">{errors.address.zipCode.message}</p>}</div>)} />
                                <Controller name="address.street" control={control} render={({ field }) => (<div><Label>Rua *</Label><Input {...field} disabled={loading} />{errors.address?.street && <p className="text-sm text-destructive">{errors.address.street.message}</p>}</div>)} />
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Controller name="address.number" control={control} render={({ field }) => (<div><Label>Número *</Label><Input {...field} disabled={loading} />{errors.address?.number && <p className="text-sm text-destructive">{errors.address.number.message}</p>}</div>)} />
                                    <Controller name="address.complement" control={control} render={({ field }) => (<div className="md:col-span-2"><Label>Complemento</Label><Input {...field} disabled={loading} /></div>)} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Controller name="address.neighborhood" control={control} render={({ field }) => (<div><Label>Bairro *</Label><Input {...field} disabled={loading} />{errors.address?.neighborhood && <p className="text-sm text-destructive">{errors.address.neighborhood.message}</p>}</div>)} />
                                    <Controller name="address.city" control={control} render={({ field }) => (<div><Label>Cidade *</Label><Input {...field} disabled={loading} />{errors.address?.city && <p className="text-sm text-destructive">{errors.address.city.message}</p>}</div>)} />
                                </div>
                                <Controller name="address.state" control={control} render={({ field }) => (<div><Label>Estado *</Label><Input {...field} disabled={loading} />{errors.address?.state && <p className="text-sm text-destructive">{errors.address.state.message}</p>}</div>)} />

                                <div className="flex gap-4">
                                    <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full" disabled={loading}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>

                                    {/* Botão de Próximo (Médico) ou Finalizar (Paciente) */}
                                    {role === 'doctor' ? (
                                        <Button type="button" onClick={handleNextStep} className="w-full font-semibold" disabled={loading}>
                                            Próximo<ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    ) : (
                                        <Button type="submit" className="w-full font-semibold" disabled={loading}>
                                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                            Finalizar Cadastro
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}

                        {/* --- ETAPA 3 (Só para Médicos) --- */}
                        {step === 3 && role === 'doctor' && (
                            <>
                                <h3 className="font-semibold text-center">Dados Profissionais e da Clínica</h3>
                                <div className="space-y-2">
                                    <Label htmlFor="crm">CRM *</Label>
                                    <Input id="crm" {...register("crm")} disabled={loading} />
                                    {errors.crm && <p className="text-sm text-destructive">{errors.crm.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="especializacao">Especialização (Opcional)</Label>
                                    <Input id="especializacao" {...register("especializacao")} disabled={loading} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rqe">RQE (Opcional)</Label>
                                    <Input id="rqe" {...register("rqe")} disabled={loading} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="clinicName">Nome da Clínica (Opcional)</Label>
                                    <Input id="clinicName" {...register("clinicName")} disabled={loading} placeholder="Ex: Consultório Dr. Sobrenome" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="clinicCnpj">CNPJ da Clínica (Opcional)</Label>
                                    <Controller name="clinicCnpj" control={control} render={({ field }) => (
                                        <IMaskInput
                                            mask="00.000.000/0000-00"
                                            unmask={true}
                                            onAccept={field.onChange}
                                            value={field.value || ''}
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                            disabled={loading}
                                        />
                                    )} />
                                    {errors.clinicCnpj && <p className="text-sm text-destructive">{errors.clinicCnpj.message}</p>}
                                </div>

                                <div className="flex gap-4">
                                    <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-full" disabled={loading}>
                                        <ArrowLeft className="mr-2 h-4 w-4" />
                                        Voltar
                                    </Button>
                                    <Button type="submit" className="w-full font-semibold" disabled={loading}>
                                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                        Finalizar Cadastro
                                    </Button>
                                </div>
                            </>
                        )}
                    </form>

                    <p className="mt-8 text-center text-sm text-muted-foreground">
                        Já tem uma conta?{' '}
                        <Link
                            href="/login"
                            className={cn(
                                "font-medium text-primary hover:underline",
                                loading && "pointer-events-none opacity-50"
                            )}
                            aria-disabled={loading}
                            tabIndex={loading ? -1 : undefined}
                        >
                            Faça login
                        </Link>
                    </p>
                </>
            )}
        </AuthLayout>
    );
}
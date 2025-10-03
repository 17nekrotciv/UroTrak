"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, writeBatch, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import { Loader2, UserPlus, ArrowLeft, ArrowRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IMaskInput } from 'react-imask';
import { useCepAutocomplete } from '@/hooks/use-cep-autocomplete';

// --- SCHEMAS ATUALIZADOS PARA 3 ETAPAS ---
const step1Schema = z.object({
  displayName: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Email inválido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});

const step2Schema = z.object({
  cpf: z.string().length(11, { message: "CPF deve ter 11 dígitos." }),
  phone: z.string().min(10, { message: "Telefone inválido." }),
  birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Data de nascimento inválida." }),
  gender: z.enum(['Masculino', 'Feminino']),
  cep: z.string().length(8, { message: "CEP deve ter 8 dígitos." }),
  street: z.string().min(3, { message: "A rua é obrigatória." }),
  number: z.string().min(1, { message: "O número é obrigatório." }),
  complement: z.string().optional(),
  neighborhood: z.string().min(3, { message: "O bairro é obrigatório." }),
  city: z.string().min(3, { message: "A cidade é obrigatória." }),
  state: z.string().length(2, { message: "O estado é obrigatório." }),
});

const step3Schema = z.object({
  crm: z.string().min(3, { message: "CRM inválido." }),
  especializacao: z.string().optional(),
  rqe: z.string().optional(),
  clinicName: z.string().min(2, { message: "O nome da clínica é obrigatório." }),
  clinicCnpj: z.string().length(14, { message: "CNPJ deve ter 14 números." }),
});

// Junta todos os schemas
const signupSchema = step1Schema.merge(step2Schema).merge(step3Schema);

type SignupFormInputs = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const router = useRouter();
  const { toast } = useToast();

  const { register, handleSubmit, formState: { errors }, trigger, control, setValue, setFocus } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur"
  });

  const { isCepLoading, handleCepSearch } = useCepAutocomplete({ setValue, setFocus });

  const onSignupSuccess = () => {
    toast({ title: "Cadastro realizado com sucesso!", description: "Você será redirecionado para o painel." });
    router.push('/doctor-dashboard');
  };

  const onSignupError = (error: any) => {
    console.error(`Signup error:`, error);
    let errorMessage = `Ocorreu um erro ao tentar criar a conta. Tente novamente.`;

    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string; message?: string };
      switch (firebaseError.code) {
        case 'auth/email-already-in-use':
          errorMessage = "Este email já está cadastrado. Tente fazer login ou use um email diferente.";
          break;
        case 'auth/invalid-email':
          errorMessage = "O email fornecido não é válido.";
          break;
        case 'auth/weak-password':
          errorMessage = "A senha fornecida é muito fraca. Por favor, use uma senha mais forte.";
          break;
        case 'permission-denied':
          errorMessage = "Falha ao salvar dados do usuário: permissão negada. Verifique as Regras de Segurança do Firestore.";
          break;
        default:
          errorMessage = `Erro no cadastro (${firebaseError.code}): ${firebaseError.message || 'Tente novamente.'}`;
      }
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = (error as { message: string }).message;
    }

    toast({ title: "Erro no Cadastro", description: errorMessage, variant: "destructive" });
  };

  const handleNextStep = async () => {
    let fieldsToValidate: (keyof SignupFormInputs)[] = [];
    if (step === 1) {
      fieldsToValidate = ["displayName", "email", "password"];
    } else if (step === 2) {
      fieldsToValidate = ["cpf", "phone", "birthDate", "gender", "cep", "street", "number", "neighborhood", "city", "state"];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep(prev => prev + 1);
    }
  };

  const onSubmit: SubmitHandler<SignupFormInputs> = async (data) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: data.displayName });

      const batch = writeBatch(db);

      const clinicRef = doc(db, "clinic", data.clinicCnpj);
      batch.set(clinicRef, {
        name: data.clinicName,
        ownerId: user.uid,
        createdAt: Timestamp.now(),
      });

      const userRef = doc(db, "users", user.uid);
      batch.set(userRef, {
        uid: user.uid,
        email: data.email,
        displayName: data.displayName,
        role: 'doctor',
        createdAt: Timestamp.now(),
        // Dados Pessoais
        cpf: data.cpf,
        phone: data.phone,
        birthDate: data.birthDate,
        gender: data.gender,
        address: {
          street: data.street,
          number: data.number,
          complement: data.complement,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          zipCode: data.cep,
        },
        // Dados Profissionais
        crm: data.crm,
        especializacao: data.especializacao,
        rqe: data.rqe,
        clinicId: data.clinicCnpj,
      });

      await batch.commit();
      onSignupSuccess();

    } catch (error: any) {
      onSignupError(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Cadastro de Médico">
      <div className="mb-4 text-center text-sm text-gray-600">
        Etapa {step} de 3
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {step === 1 && (
          <>
            <h3 className="font-semibold text-center">Informações de Acesso</h3>
            <div className="space-y-2">
              <Label htmlFor="displayName">Nome Completo</Label>
              <Input id="displayName" {...register("displayName")} />
              {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Profissional</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
            </div>
            <Button type="button" onClick={handleNextStep} className="w-full font-semibold">
              Próximo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}

        {step === 2 && (
          <>
            <h3 className="font-semibold text-center">Dados Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller name="cpf" control={control} render={({ field }) => (<div><Label>CPF *</Label><IMaskInput mask="000.000.000-00" unmask={true} onAccept={field.onChange} value={field.value || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />{errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}</div>)} />
              <Controller name="phone" control={control} render={({ field }) => (<div><Label>Telefone *</Label><IMaskInput mask="(00) 00000-0000" unmask={true} onAccept={field.onChange} value={field.value || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />{errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}</div>)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller name="birthDate" control={control} render={({ field }) => (<div><Label>Data de Nascimento *</Label><Input type="date" {...field} />{errors.birthDate && <p className="text-sm text-destructive">{errors.birthDate.message}</p>}</div>)} />
              <Controller name="gender" control={control} render={({ field }) => (<div><Label>Gênero *</Label><Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Feminino">Feminino</SelectItem></SelectContent></Select>{errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}</div>)} />
            </div>
            <Controller name="cep" control={control} render={({ field }) => (<div><Label>CEP *</Label><div className='relative'><IMaskInput mask="00000-000" unmask={true} onAccept={(v) => { field.onChange(v); handleCepSearch(v) }} value={field.value || ''} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" />{isCepLoading && <Loader2 className="absolute right-2 top-2.5 h-4 w-4 animate-spin" />}</div>{errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}</div>)} />
            <Controller name="street" control={control} render={({ field }) => (<div><Label>Rua *</Label><Input {...field} />{errors.street && <p className="text-sm text-destructive">{errors.street.message}</p>}</div>)} />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Controller name="number" control={control} render={({ field }) => (<div><Label>Número *</Label><Input {...field} />{errors.number && <p className="text-sm text-destructive">{errors.number.message}</p>}</div>)} />
              <Controller name="complement" control={control} render={({ field }) => (<div className="md:col-span-2"><Label>Complemento</Label><Input {...field} /></div>)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Controller name="neighborhood" control={control} render={({ field }) => (<div><Label>Bairro *</Label><Input {...field} />{errors.neighborhood && <p className="text-sm text-destructive">{errors.neighborhood.message}</p>}</div>)} />
              <Controller name="city" control={control} render={({ field }) => (<div><Label>Cidade *</Label><Input {...field} />{errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}</div>)} />
            </div>
            <Controller name="state" control={control} render={({ field }) => (<div><Label>Estado *</Label><Input {...field} />{errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}</div>)} />

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)} className="w-full"><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button>
              <Button type="button" onClick={handleNextStep} className="w-full font-semibold">Próximo<ArrowRight className="ml-2 h-4 w-4" /></Button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h3 className="font-semibold text-center">Dados Profissionais e da Clínica</h3>
            <div className="space-y-2">
              <Label htmlFor="crm">CRM *</Label>
              <Input id="crm" {...register("crm")} />
              {errors.crm && <p className="text-sm text-destructive">{errors.crm.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="especializacao">Especialização (Opcional)</Label>
              <Input id="especializacao" {...register("especializacao")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rqe">RQE (Opcional)</Label>
              <Input id="rqe" {...register("rqe")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicName">Nome da Clínica *</Label>
              <Input id="clinicName" {...register("clinicName")} />
              {errors.clinicName && <p className="text-sm text-destructive">{errors.clinicName.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="clinicCnpj">CNPJ da Clínica *</Label>
              <Controller name="clinicCnpj" control={control} render={({ field }) => (
                <IMaskInput
                  mask="00.000.000/0000-00"
                  unmask={true}
                  onAccept={field.onChange}
                  value={field.value || ''}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                />
              )} />
              {errors.clinicCnpj && <p className="text-sm text-destructive">{errors.clinicCnpj.message}</p>}
            </div>

            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => setStep(2)} className="w-full">
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
        <Link href="/login" className="font-medium text-primary hover:underline">
          Faça login
        </Link>
      </p>
    </AuthLayout>
  );
}
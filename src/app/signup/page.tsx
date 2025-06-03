// src/app/signup/page.tsx
"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Assuming db is exported from firebase.ts for Firestore
import { doc, setDoc, Timestamp } from 'firebase/firestore'; // Import Timestamp
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import { Loader2, UserPlus } from 'lucide-react';

const signupSchema = z.object({
  displayName: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Email inválido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});

type SignupFormInputs = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit: SubmitHandler<SignupFormInputs> = async (data) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: data.displayName });

      // Create a user document in Firestore
      await setDoc(doc(db, "users", user.uid), {
        displayName: data.displayName,
        email: user.email,
        createdAt: Timestamp.fromDate(new Date()), // Use Firestore Timestamp
      });

      toast({ title: "Cadastro realizado com sucesso!", description: "Você será redirecionado para o painel." });
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Erro detalhado no cadastro:", error); // Log the full error object
      let errorMessage = "Ocorreu um erro ao tentar criar a conta. Por favor, tente novamente.";
      
      if (error.code) {
        switch (error.code) {
          case 'auth/email-already-in-use':
            errorMessage = "Este email já está cadastrado. Tente fazer login ou use um email diferente.";
            break;
          case 'auth/invalid-email':
            errorMessage = "O email fornecido não é válido.";
            break;
          case 'auth/operation-not-allowed':
            errorMessage = "O cadastro com email e senha não está habilitado. Contate o suporte.";
            break;
          case 'auth/weak-password':
            errorMessage = "A senha fornecida é muito fraca. Por favor, use uma senha mais forte.";
            break;
          case 'permission-denied': // Firestore permission error
            errorMessage = "Falha ao salvar dados do usuário: permissão negada. Verifique as regras de segurança do Firestore.";
            break;
          default:
            errorMessage = `Erro no cadastro (${error.code}): ${error.message || 'Tente novamente.'}`;
        }
      } else if (error.message) {
        // Fallback for non-Firebase errors or errors without a code
        errorMessage = error.message;
      }

      toast({
        title: "Erro no Cadastro",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Cadastro UroTrack">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="displayName">Nome Completo</Label>
          <Input
            id="displayName"
            type="text"
            placeholder="Seu nome"
            {...register("displayName")}
            className={errors.displayName ? "border-destructive" : ""}
          />
          {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seuemail@exemplo.com"
            {...register("email")}
            className={errors.email ? "border-destructive" : ""}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="Crie uma senha"
            {...register("password")}
            className={errors.password ? "border-destructive" : ""}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full font-semibold" disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
          Cadastrar
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Faça login
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}

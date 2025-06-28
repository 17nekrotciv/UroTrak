// src/app/signup/page.tsx
"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, updateProfile, signInWithPopup, type AuthProvider as FirebaseAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import { Loader2, UserPlus } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { FcGoogle } from 'react-icons/fc';

const signupSchema = z.object({
  displayName: z.string().min(2, { message: "O nome deve ter pelo menos 2 caracteres." }),
  email: z.string().email({ message: "Email inválido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});

type SignupFormInputs = z.infer<typeof signupSchema>;

export default function SignupPage() {
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
  });
  
  const onSignupSuccess = () => {
    toast({ title: "Cadastro realizado com sucesso!", description: "Você será redirecionado para o painel." });
    router.push('/dashboard');
  };

  const onSignupError = (error: any, providerName?: string) => {
    console.error(`${providerName || 'Email/Password'} Signup error:`, error);
    let errorMessage = `Ocorreu um erro ao tentar criar a conta${providerName ? ` com ${providerName}` : ''}. Tente novamente.`;
    
    if (error && typeof error === 'object' && 'code' in error) {
      const firebaseError = error as { code: string; message?: string };
      switch (firebaseError.code) {
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
        case 'auth/popup-closed-by-user':
          errorMessage = `Cadastro com ${providerName} cancelado pelo usuário.`;
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = `Já existe uma conta com este email, mas utilizando um método de login diferente. Tente o método original ou entre em contato com o suporte.`;
          break;
        case 'auth/cancelled-popup-request':
        case 'auth/popup-blocked':
          errorMessage = `O popup de cadastro com ${providerName} foi bloqueado pelo navegador. Por favor, habilite popups para este site.`;
          break;
        case 'permission-denied': 
           errorMessage = "Falha ao salvar dados do usuário: permissão negada. Verifique as regras de segurança do Firestore.";
           break;
        default:
          errorMessage = `Erro no cadastro (${firebaseError.code})${providerName ? ` com ${providerName}` : ''}: ${firebaseError.message || 'Tente novamente.'}`;
      }
    } else if (error && typeof error === 'object' && 'message' in error) {
       errorMessage = (error as {message: string}).message;
    }
    
    toast({ title: "Erro no Cadastro", description: errorMessage, variant: "destructive" });
  };

  const onSubmit: SubmitHandler<SignupFormInputs> = async (data) => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;
      // Update the user's profile in Firebase Auth. onAuthStateChanged will handle the Firestore part.
      await updateProfile(user, { displayName: data.displayName });
      onSignupSuccess();
    } catch (error: any) {
      onSignupError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignup = async (provider: FirebaseAuthProvider, providerName: string) => {
    setSocialLoading(providerName);
    try {
      await signInWithPopup(auth, provider);
      // The logic to handle user data in Firestore is now centralized in AuthProvider.
      onSignupSuccess();
    } catch (error: any) {
      onSignupError(error, providerName);
    } finally {
      setSocialLoading(null);
    }
  };

  const socialProviders = [
    { name: "Google", provider: googleProvider, icon: FcGoogle, disabled: false },
  ];

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
            disabled={loading || !!socialLoading}
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
            disabled={loading || !!socialLoading}
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
            disabled={loading || !!socialLoading}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full font-semibold" disabled={loading || !!socialLoading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
          Cadastrar com Email
        </Button>
      </form>

      <Separator className="my-6" />
      
      <div className="space-y-3">
        <p className="text-center text-sm text-muted-foreground">Ou cadastre-se com</p>
        {socialProviders.map(sp => (
          <Button
            key={sp.name}
            variant="outline"
            className="w-full"
            onClick={() => handleSocialSignup(sp.provider, sp.name)}
            disabled={sp.disabled || loading || !!socialLoading}
            aria-label={`Cadastrar com ${sp.name}`}
          >
            {socialLoading === sp.name ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <sp.icon className="mr-2 h-5 w-5" />
            )}
            Continuar com {sp.name}
          </Button>
        ))}
      </div>

      <p className="mt-8 text-center text-sm text-muted-foreground">
        Já tem uma conta?{' '}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Faça login
        </Link>
      </p>
    </AuthLayout>
  );
}

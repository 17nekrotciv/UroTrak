// src/app/login/page.tsx
"use client";

import React, { useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithPopup, type AuthProvider as FirebaseAuthProvider } from 'firebase/auth';
import { auth, googleProvider, testFirebaseConnection } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import AuthLayout from '@/components/auth/AuthLayout';
import { Loader2, LogIn, HelpCircle } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { FcGoogle } from 'react-icons/fc';

const loginSchema = z.object({
  email: z.string().email({ message: "Email inválido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onLoginSuccess = () => {
    toast({ title: "Login bem-sucedido!", description: "Redirecionando para o painel..." });
    router.push('/dashboard');
  };

  const onLoginError = (error: any, providerName?: string) => {
    console.error(`${providerName || 'Email/Password'} Login error:`, error);
    let errorMessage = `Ocorreu um erro ao tentar fazer login${providerName ? ` com ${providerName}` : ''}. Tente novamente.`;
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = "Email ou senha inválidos.";
          break;
        case 'auth/popup-closed-by-user':
          errorMessage = `Login com ${providerName} cancelado pelo usuário.`;
          break;
        case 'auth/account-exists-with-different-credential':
          errorMessage = `Já existe uma conta com este email, mas utilizando um método de login diferente. Tente o método original ou entre em contato com o suporte.`;
          break;
        case 'auth/cancelled-popup-request':
        case 'auth/popup-blocked':
          errorMessage = `O popup de login com ${providerName} foi bloqueado pelo navegador. Por favor, habilite popups para este site.`;
          break;
        default:
          errorMessage = `Erro (${error.code}) ao fazer login${providerName ? ` com ${providerName}` : ''}. Tente novamente.`;
      }
    }
    toast({ title: "Erro no Login", description: errorMessage, variant: "destructive" });
  };

  const onSubmit: SubmitHandler<LoginFormInputs> = async (data) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, data.email, data.password);
      // The logic to handle user data in Firestore is now centralized in AuthProvider.
      onLoginSuccess();
    } catch (error: any) {
      onLoginError(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: FirebaseAuthProvider, providerName: string) => {
    setSocialLoading(providerName);
    try {
      await signInWithPopup(auth, provider);
      // The logic to handle user data in Firestore is now centralized in AuthProvider.
      onLoginSuccess();
    } catch (error: any) {
      onLoginError(error, providerName);
    } finally {
      setSocialLoading(null);
    }
  };
  
  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    const result = await testFirebaseConnection();
    toast({
        title: result.success ? "Teste de Conexão" : "Falha no Teste de Conexão",
        description: result.message,
        variant: result.success ? "default" : "destructive",
        duration: 9000,
    });
    setIsTestingConnection(false);
  };

  const socialProviders = [
    { name: "Google", provider: googleProvider, icon: FcGoogle, disabled: false },
  ];

  return (
    <AuthLayout title="Login UroTrack">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="seuemail@exemplo.com"
            {...register("email")}
            className={errors.email ? "border-destructive" : ""}
            disabled={loading || !!socialLoading || isTestingConnection}
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            placeholder="Sua senha"
            {...register("password")}
            className={errors.password ? "border-destructive" : ""}
            disabled={loading || !!socialLoading || isTestingConnection}
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
        </div>
        <Button type="submit" className="w-full font-semibold" disabled={loading || !!socialLoading || isTestingConnection}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
          Entrar
        </Button>
      </form>

      <Button 
        type="button"
        variant="outline"
        className="w-full font-semibold mt-4 border-dashed"
        onClick={handleTestConnection}
        disabled={loading || !!socialLoading || isTestingConnection}
      >
        {isTestingConnection ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <HelpCircle className="mr-2 h-4 w-4" />}
        Testar Conexão com Firebase
      </Button>

      <Separator className="my-6" />
      
      <div className="space-y-3">
        <p className="text-center text-sm text-muted-foreground">Ou continue com</p>
        {socialProviders.map(sp => (
          <Button
            key={sp.name}
            variant="outline"
            className="w-full"
            onClick={() => handleSocialLogin(sp.provider, sp.name)}
            disabled={sp.disabled || loading || !!socialLoading || isTestingConnection}
            aria-label={`Entrar com ${sp.name}`}
          >
            {socialLoading === sp.name ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <sp.icon className="mr-2 h-5 w-5" />
            )}
            Entrar com {sp.name}
          </Button>
        ))}
      </div>
      
      <p className="mt-8 text-center text-sm text-muted-foreground">
        Não tem uma conta?{' '}
        <Link href="/signup" className="font-medium text-primary hover:underline">
          Cadastre-se
        </Link>
      </p>
    </AuthLayout>
  );
}

"use client";

import { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { IMaskInput } from 'react-imask';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useData } from '@/contexts/data-provider';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PageHeader from '@/components/ui/PageHeader';
import { Loader2, UserPlus, ArrowLeft } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserProfile } from '@/types';

// Schema de validação com Zod
const patientSchema = z.object({
    displayName: z.string().min(3, { message: "O nome é obrigatório." }),
    email: z.string().email({ message: "Email inválido." }),
    password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
    cpf: z.string().length(11, { message: "CPF deve ter 11 dígitos." }),
    phone: z.string().min(10, { message: "Telefone inválido." }),
    birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), { message: "Data de nascimento inválida." }),
    gender: z.enum(['Masculino', 'Feminino', 'Outro', 'Não informar']),
    cep: z.string().length(8, { message: "CEP deve ter 8 dígitos." }),
    street: z.string().min(3, { message: "A rua é obrigatória." }),
    number: z.string().min(1, { message: "O número é obrigatório." }),
    complement: z.string().optional(),
    neighborhood: z.string().min(3, { message: "O bairro é obrigatório." }),
    city: z.string().min(3, { message: "A cidade é obrigatória." }),
    state: z.string().length(2, { message: "O estado é obrigatório." }),
});

type PatientFormInputs = z.infer<typeof patientSchema>;

export default function AddUserPage() {
    const { createPatientAccount } = useData();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isCepLoading, setIsCepLoading] = useState(false);

    const {
        handleSubmit,
        control,
        formState: { errors },
        setValue,
        setFocus,
    } = useForm<PatientFormInputs>({
        resolver: zodResolver(patientSchema),
    });

    const handleCepSearch = useCallback(async (cep: string) => {
        setIsCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                toast({ title: "CEP não encontrado", variant: "destructive" });
                return;
            }

            setValue('street', data.logradouro);
            setValue('neighborhood', data.bairro);
            setValue('city', data.localidade);
            setValue('state', data.uf);

            setFocus('number');

        } catch (error) {
            toast({ title: "Erro ao buscar CEP", description: "Verifique sua conexão.", variant: "destructive" });
        } finally {
            setIsCepLoading(false);
        }
    }, [setValue, setFocus, toast]);

    const onSubmit = async (data: PatientFormInputs) => {
        setIsSubmitting(true);
        try {
            const userData = data as Omit<UserProfile, 'uid' | 'role' | 'clinicId'> & { password: string };
            await createPatientAccount(userData);

            toast({
                title: "✅ Sucesso!",
                description: `A conta para ${data.displayName} foi criada.`,
            });
            router.push('/doctor-dashboard');
        } catch (error: any) {
            toast({
                title: "❌ Erro ao criar paciente",
                description: error.message || "Ocorreu um erro desconhecido.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            <PageHeader
                title="Adicionar Novo Paciente"
                description="Preencha os dados abaixo para criar uma conta para o paciente."
                icon={UserPlus}
            >
                <Button asChild variant="outline">
                    <Link href="/doctor-dashboard">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar para a Lista
                    </Link>
                </Button>
            </PageHeader>
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Informações do Paciente</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {/* Nome Completo */}
                            <Controller
                                name="displayName"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2 lg:col-span-2">
                                        <Label htmlFor="displayName">Nome Completo *</Label>
                                        <Input id="displayName" {...field} />
                                        {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
                                    </div>
                                )}
                            />

                            {/* Email */}
                            <Controller
                                name="email"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email *</Label>
                                        <Input id="email" type="email" {...field} />
                                        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                                    </div>
                                )}
                            />

                            {/* CPF */}
                            <div className="space-y-2">
                                <Label htmlFor="cpf">CPF *</Label>
                                <Controller
                                    name="cpf"
                                    control={control}
                                    render={({ field: { onChange, onBlur, value, name, ref } }) => (
                                        <IMaskInput
                                            mask="000.000.000-00"
                                            value={value || ''}
                                            unmask={true}
                                            onAccept={(unmaskedValue) => onChange(unmaskedValue)}
                                            onBlur={onBlur}
                                            name={name}
                                            inputRef={ref}
                                            id="cpf"
                                            placeholder="000.000.000-00"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    )}
                                />
                                {errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}
                            </div>

                            {/* Telefone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone *</Label>
                                <Controller
                                    name="phone"
                                    control={control}
                                    render={({ field: { onChange, onBlur, value, name, ref } }) => (
                                        <IMaskInput
                                            mask="(00) 00000-0000"
                                            value={value || ''}
                                            unmask={true}
                                            onAccept={(unmaskedValue) => onChange(unmaskedValue)}
                                            onBlur={onBlur}
                                            name={name}
                                            inputRef={ref}
                                            id="phone"
                                            placeholder="(99) 99999-9999"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    )}
                                />
                                {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                            </div>

                            {/* Data de Nascimento */}
                            <Controller
                                name="birthDate"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="birthDate">Data de Nascimento *</Label>
                                        <Input id="birthDate" type="date" {...field} />
                                        {errors.birthDate && <p className="text-sm text-destructive">{errors.birthDate.message}</p>}
                                    </div>
                                )}
                            />

                            {/* Gênero */}
                            <div className="space-y-2">
                                <Label htmlFor="gender">Gênero *</Label>
                                <Controller
                                    name="gender"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <SelectTrigger id="gender">
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="Masculino">Masculino</SelectItem>
                                                <SelectItem value="Feminino">Feminino</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}
                            </div>

                            {/* CEP */}
                            <div className="space-y-2">
                                <Label htmlFor="cep">CEP * {isCepLoading && <Loader2 className="inline-block ml-2 h-4 w-4 animate-spin" />}</Label>
                                <Controller
                                    name="cep"
                                    control={control}
                                    render={({ field: { onChange, onBlur, value, name, ref } }) => (
                                        <IMaskInput
                                            mask="00000-000"
                                            value={value || ''}
                                            unmask={true}
                                            onAccept={(unmaskedValue) => {
                                                onChange(unmaskedValue);
                                                if (unmaskedValue.length === 8) {
                                                    handleCepSearch(unmaskedValue);
                                                }
                                            }}
                                            onBlur={onBlur}
                                            name={name}
                                            inputRef={ref}
                                            id="cep"
                                            placeholder="00000-000"
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    )}
                                />
                                {errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}
                            </div>

                            {/* Rua (Logradouro) */}
                            <Controller
                                name="street"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2 lg:col-span-2">
                                        <Label htmlFor="street">Rua *</Label>
                                        <Input id="street" {...field} />
                                        {errors.street && <p className="text-sm text-destructive">{errors.street.message}</p>}
                                    </div>
                                )}
                            />

                            {/* Número */}
                            <Controller
                                name="number"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="number">Número *</Label>
                                        <Input id="number" {...field} />
                                        {errors.number && <p className="text-sm text-destructive">{errors.number.message}</p>}
                                    </div>
                                )}
                            />

                            {/* Complemento */}
                            <Controller
                                name="complement"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="complement">Complemento</Label>
                                        <Input id="complement" {...field} />
                                    </div>
                                )}
                            />

                            {/* Bairro */}
                            <Controller
                                name="neighborhood"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="neighborhood">Bairro *</Label>
                                        <Input id="neighborhood" {...field} />
                                        {errors.neighborhood && <p className="text-sm text-destructive">{errors.neighborhood.message}</p>}
                                    </div>
                                )}
                            />

                            {/* Cidade */}
                            <Controller
                                name="city"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="city">Cidade *</Label>
                                        <Input id="city" {...field} />
                                        {errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}
                                    </div>
                                )}
                            />

                            {/* Estado */}
                            <Controller
                                name="state"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2">
                                        <Label htmlFor="state">Estado *</Label>
                                        <Input id="state" {...field} />
                                        {errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}
                                    </div>
                                )}
                            />

                            {/* Senha */}
                            <Controller
                                name="password"
                                control={control}
                                render={({ field }) => (
                                    <div className="space-y-2 md:col-span-2 lg:col-span-3">
                                        <Label htmlFor="password">Senha Provisória *</Label>
                                        <Input id="password" type="password" {...field} />
                                        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                                    </div>
                                )}
                            />
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                Criar Conta do Paciente
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </>
    );
}
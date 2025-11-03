// src/app/doctor-dashboard/InvitePatientModal.tsx
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Send } from 'lucide-react';
import { useData } from '@/contexts/data-provider';
import { useToast } from '@/hooks/use-toast';

// Schema de validação simples para o e-mail
const inviteSchema = z.object({
    email: z.string().email({ message: "Por favor, insira um e-mail válido." }),
});
type InviteFormInputs = z.infer<typeof inviteSchema>;

interface InvitePatientModalProps {
    children: React.ReactNode; // O botão que vai abrir este modal
}

export function InvitePatientModal({ children }: InvitePatientModalProps) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { sendPatientInviteEmail } = useData();
    const { toast } = useToast();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<InviteFormInputs>({
        resolver: zodResolver(inviteSchema),
    });

    const onSubmit = async (data: InviteFormInputs) => {
        setIsSubmitting(true);
        try {
            const result = await sendPatientInviteEmail(data.email);
            toast({
                title: "✅ Convite Enviado!",
                description: result.message,
            });
            reset(); // Limpa o formulário
            setOpen(false); // Fecha o modal
        } catch (error: any) {
            toast({
                title: "❌ Erro ao enviar convite",
                description: error.message || "Ocorreu um erro desconhecido.",
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogHeader>
                        <DialogTitle>Convidar Paciente por E-mail</DialogTitle>
                        <DialogDescription>
                            Insira o e-mail do paciente. Ele receberá um link seguro para
                            completar o cadastro e será automaticamente vinculado à sua clínica.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail do Paciente</Label>
                            <Input
                                id="email"
                                placeholder="nome@paciente.com"
                                {...register("email")}
                                disabled={isSubmitting}
                            />
                            {errors.email && (
                                <p className="text-sm text-destructive">{errors.email.message}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="mr-2 h-4 w-4" />
                            )}
                            Enviar Convite
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
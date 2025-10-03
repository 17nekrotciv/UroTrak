"use client";

import React from 'react';
import PageHeader from '@/components/ui/PageHeader';
import { Loader2, FileText, Users, UserPlus } from 'lucide-react'; // Ícone UserPlus importado
import { useData } from '@/contexts/data-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const capitalize = (s: string) => {
    if (typeof s !== 'string' || !s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function UserListPage() {
    const { clinicUsers, loadingClinicUsers, userProfile } = useData();

    if (!userProfile) {
        return (
            <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg font-semibold text-foreground">Verificando permissões...</p>
            </div>
        );
    }

    if (userProfile.role !== 'doctor') {
        return (
            <>
                <PageHeader
                    title="Acesso Negado"
                    description="Você não tem permissão para visualizar esta página."
                    icon={Users}
                />
                <div className="flex flex-col items-center justify-center text-center p-8">
                    <h2 className="text-xl font-bold">Acesso Restrito</h2>
                    <p className="text-muted-foreground">Esta área é destinada apenas para usuários com perfil de médico.</p>
                </div>
            </>
        );
    }

    if (loadingClinicUsers) {
        return (
            <div className="flex min-h-[calc(100vh-10rem)] items-center justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="ml-4 text-lg font-semibold text-foreground">Carregando lista de pacientes...</p>
            </div>
        );
    }

    return (
        <>
            <PageHeader
                title="Lista de Pacientes"
                description={`Pacientes associados à clínica: ${userProfile.clinic?.name || 'N/A'}`}
                icon={Users}
            >
                {/* Botão "Adicionar Paciente" adicionado aqui */}
                <Button asChild>
                    <Link href="/doctor-dashboard/add-user">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Adicionar Paciente
                    </Link>
                </Button>
            </PageHeader>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Pacientes da Clínica</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[250px]">Nome</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clinicUsers && clinicUsers.length > 0 ? (
                                clinicUsers.map((user) => (
                                    <TableRow key={user.uid}>
                                        <TableCell className="font-medium">{user.displayName}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>{capitalize(user.role)}</TableCell>
                                        <TableCell className="text-right">
                                            <Button asChild variant="outline" size="sm">
                                                <Link href={`/doctor-dashboard/user-dashboard/${user.uid}`}>
                                                    <FileText className="w-4 h-4 mr-2" />
                                                    Ver Resumo
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        Nenhum paciente encontrado para esta clínica.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </>
    );
}
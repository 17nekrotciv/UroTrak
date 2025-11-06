// src/app/doctor-dashboard/page.tsx
"use client";

import React, { useState } from 'react'; // 1. Importar o useState
import PageHeader from '@/components/ui/PageHeader';
import { Loader2, FileText, Users, UserPlus, MailPlus, Search } from 'lucide-react'; // 2. Importar o ícone de Busca
import { useData } from '@/contexts/data-provider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { InvitePatientModal } from './invite/page';
import { Input } from '@/components/ui/input'; // 3. Importar o Input

const capitalize = (s: string) => {
    if (typeof s !== 'string' || !s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1);
};

export default function UserListPage() {
    const { clinicUsers, loadingClinicUsers, userProfile } = useData();
    const [filter, setFilter] = useState(''); // 4. Adicionar estado para o filtro

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

    // 5. Criar a lista de usuários filtrados
    const filteredUsers = clinicUsers.filter(user =>
        user.displayName?.toLowerCase().includes(filter.toLowerCase())
    );

    return (
        <>
            <PageHeader
                title="Lista de Pacientes"
                description={`Pacientes associados à clínica: ${userProfile.clinic?.name || 'N/A'}`}
                icon={Users}
            >
                <div className="flex flex-col sm:flex-row gap-2">
                    <InvitePatientModal>
                        <Button variant="outline">
                            <MailPlus className="h-4 w-4 mr-2" />
                            Convidar por Email
                        </Button>
                    </InvitePatientModal>
                    <Button asChild>
                        <Link href="/doctor-dashboard/add-user">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Adicionar Paciente
                        </Link>
                    </Button>
                </div>
            </PageHeader>

            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle>Pacientes da Clínica</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* 6. Adicionar o campo de Input para o filtro */}
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filtrar por nome..."
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            className="w-full max-w-sm pl-10"
                        />
                    </div>

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
                            {/* 7. Usar a lista filtrada e atualizar a mensagem de "nenhum resultado" */}
                            {filteredUsers.length > 0 ? (
                                filteredUsers.map((user) => (
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
                                        {clinicUsers.length > 0
                                            ? `Nenhum paciente encontrado com o nome "${filter}".`
                                            : "Nenhum paciente encontrado. Use os botões acima para adicionar ou convidar."
                                        }
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
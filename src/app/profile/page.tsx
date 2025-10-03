'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { User, Pencil, Save, X, Loader2 } from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { IMaskInput } from 'react-imask';

import { useAuth } from '@/contexts/auth-provider';
import { useData } from '@/contexts/data-provider';
import { useToast } from '@/hooks/use-toast';
import { useCepAutocomplete } from '@/hooks/use-cep-autocomplete';

import PageHeader from '@/components/ui/PageHeader';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import ClinicLogoUploader from '@/components/profile/ClinicLogoUploader';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { updateProfile } from 'firebase/auth';
import { auth, storage } from '@/lib/firebase';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserProfile } from '@/types';

// Schema de validação com Zod para o perfil
const profileSchema = z.object({
    displayName: z.string().min(2, "O nome é obrigatório."),
    email: z.string().email("Email inválido."),
    cpf: z.string().length(11, "CPF deve ter 11 dígitos."),
    phone: z.string().min(10, "Telefone inválido."),
    birthDate: z.string().refine((date) => !isNaN(Date.parse(date)), "Data de nascimento inválida."),
    gender: z.enum(['Masculino', 'Feminino']),
    zipCode: z.string().length(8, "CEP deve ter 8 dígitos.").optional().or(z.literal('')),
    street: z.string().optional(),
    number: z.string().optional(),
    complement: z.string().optional(), // <-- CAMPO ADICIONADO
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
});

type ProfileFormInputs = z.infer<typeof profileSchema>;

export default function ProfilePage() {
    const { authUser } = useAuth();
    const { userProfile, updateUserInfo, setUserProfile } = useData();
    const { toast } = useToast();

    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const profileImageInputRef = useRef<HTMLInputElement>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Configurando o react-hook-form
    const {
        control,
        handleSubmit,
        setValue,
        setFocus,
        reset,
        formState: { errors, isSubmitting }
    } = useForm<ProfileFormInputs>({
        resolver: zodResolver(profileSchema)
    });

    // Usando o hook de CEP
    const { isCepLoading, handleCepSearch } = useCepAutocomplete({ setValue, setFocus });

    // Efeito para popular o formulário quando o perfil do usuário é carregado
    useEffect(() => {
        if (userProfile) {
            reset({
                displayName: userProfile.displayName || '',
                email: userProfile.email || '',
                cpf: userProfile.cpf || '',
                phone: userProfile.phone || '',
                birthDate: userProfile.birthDate || '',
                gender: userProfile.gender,
                zipCode: userProfile.address?.zipCode || '',
                street: userProfile.address?.street || '',
                number: userProfile.address?.number || '',
                complement: userProfile.address?.complement || '', // <-- CAMPO ADICIONADO
                neighborhood: userProfile.address?.neighborhood || '',
                city: userProfile.address?.city || '',
                state: userProfile.address?.state || '',
            });
        }
    }, [userProfile, reset]);


    useEffect(() => {
        if (!profileImageFile && authUser?.photoURL && profileImagePreview !== authUser.photoURL) {
            setProfileImagePreview(authUser.photoURL);
        } else if (!profileImageFile && !authUser?.photoURL && profileImagePreview !== null) {
            setProfileImagePreview(null);
        }
    }, [authUser?.photoURL, profileImageFile, profileImagePreview]);


    // Lógica de salvamento adaptada para o react-hook-form
    const onSave = async (data: ProfileFormInputs) => {
        try {
            await updateUserInfo({
                ...data,
                address: {
                    zipCode: data.zipCode,
                    street: data.street,
                    number: data.number,
                    complement: data.complement, // <-- CAMPO ADICIONADO
                    neighborhood: data.neighborhood,
                    city: data.city,
                    state: data.state,
                }
            });
            setIsEditing(false);
            toast({ title: "Sucesso!", description: "Seu perfil foi atualizado." });
        } catch (error) {
            console.error("Falha ao salvar o perfil:", error);
            toast({ title: "Erro", description: "Não foi possível salvar seu perfil.", variant: "destructive" });
        }
    };

    const handleCancel = () => {
        if (userProfile) {
            reset(); // Reseta para os valores iniciais carregados
        }
        setIsEditing(false);
    };

    const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setProfileImageFile(file);
            setProfileImagePreview(URL.createObjectURL(file));
        }
    };

    const cancelProfileImageChange = () => {
        setProfileImageFile(null);
        setProfileImagePreview(authUser?.photoURL || null);
        if (profileImageInputRef.current) {
            profileImageInputRef.current.value = "";
        }
    };

    const handleProfileImageUpload = async () => {
        if (!profileImageFile || !auth.currentUser) {
            return toast({ title: "Nenhum arquivo selecionado.", variant: "destructive" });
        }

        setIsUploading(true);
        try {
            const filePath = `profilePictures/${auth.currentUser.uid}/profilePicture`;
            const fileRef = ref(storage, filePath);
            await uploadBytes(fileRef, profileImageFile);
            const photoURL = await getDownloadURL(fileRef);
            await updateProfile(auth.currentUser, { photoURL });
            await updateUserInfo({ photoURL: photoURL });

            if (setUserProfile) {
                setUserProfile((prevProfile) => {
                    if (!prevProfile) return null;
                    return { ...prevProfile, photoURL: photoURL };
                });
            }

            toast({ title: "Sucesso!", description: "Sua foto de perfil foi atualizada." });
            cancelProfileImageChange();

        } catch (error) {
            console.error("Erro ao atualizar foto de perfil:", error);
            toast({ title: "Erro", description: "Não foi possível atualizar sua foto.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };

    const handleLogoUpdate = (newLogoUrl: string) => {
        if (userProfile && setUserProfile) {
            const updatedProfile = {
                ...userProfile,
                clinic: {
                    ...userProfile.clinic!,
                    logoUrl: newLogoUrl,
                },
            };
            setUserProfile(updatedProfile);
        }
    };

    return (
        <>
            <PageHeader title="Perfil" description="Verifique ou edite suas informações" icon={User} />

            <ScrollArea className="h-[calc(100vh-15rem)] pr-4">
                <form onSubmit={handleSubmit(onSave)}>
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold">Suas Informações</h3>
                            {!profileImageFile && (
                                isEditing ? (
                                    <Button type="button" variant="ghost" size="icon" onClick={handleCancel}><X className="w-5 h-5" /></Button>
                                ) : (
                                    <Button type="button" variant="ghost" size="icon" onClick={() => setIsEditing(true)}><Pencil className="w-5 h-5" /></Button>
                                )
                            )}
                        </div>

                        <div className="flex items-start gap-6">
                            {/* Avatar */}
                            <div className="flex-shrink-0">
                                <div
                                    className="relative group w-20 h-20"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => !isUploading && profileImageInputRef.current?.click()}
                                    onKeyDown={(e) => e.key === 'Enter' && !isUploading && profileImageInputRef.current?.click()}
                                >
                                    <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                        {(() => {
                                            const imageSrc = profileImagePreview || authUser?.photoURL;
                                            if (imageSrc) {
                                                return (
                                                    <Image
                                                        src={imageSrc}
                                                        alt="Foto de perfil"
                                                        width={80}
                                                        height={80}
                                                        className="object-cover w-full h-full"
                                                    />
                                                );
                                            }
                                            return <User className="w-10 h-10 text-muted-foreground" />;
                                        })()}
                                    </div>
                                    {!isUploading && (
                                        <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                                            <Pencil className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                    {isUploading && (
                                        <div className="absolute inset-0 bg-black/70 rounded-full flex items-center justify-center">
                                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <Input
                                    ref={profileImageInputRef}
                                    type="file"
                                    accept="image/png, image/jpeg"
                                    onChange={handleProfileImageChange}
                                    className="hidden"
                                    disabled={isUploading}
                                />
                            </div>

                            {/* Informações */}
                            <div className="space-y-4 flex-1">
                                {profileImageFile ? (
                                    <div className="space-y-2 animate-in fade-in-50">
                                        <p className="text-sm font-medium">Pronto para atualizar sua foto?</p>
                                        <div className="flex items-center gap-2">
                                            <Button type="button" onClick={handleProfileImageUpload} disabled={!profileImageFile || isUploading} size="sm">
                                                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                                Salvar Foto
                                            </Button>
                                            <Button type="button" variant="ghost" onClick={cancelProfileImageChange} disabled={!profileImageFile || isUploading} size="sm">
                                                Cancelar
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    isEditing ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                            <Controller name="displayName" control={control} render={({ field }) => (
                                                <div><Label htmlFor="displayName">Nome *</Label><Input id="displayName" {...field} />{errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}</div>
                                            )} />
                                            <Controller name="email" control={control} render={({ field }) => (
                                                <div><Label htmlFor="email">Email *</Label><Input id="email" {...field} />{errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}</div>
                                            )} />
                                            <Controller name="cpf" control={control} render={({ field }) => (
                                                <div><Label htmlFor="cpf">CPF *</Label><IMaskInput mask="000.000.000-00" unmask={true} value={field.value} onAccept={field.onChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />{errors.cpf && <p className="text-sm text-destructive">{errors.cpf.message}</p>}</div>
                                            )} />
                                            <Controller name="phone" control={control} render={({ field }) => (
                                                <div><Label htmlFor="phone">Telefone *</Label><IMaskInput mask="(00) 00000-0000" unmask={true} value={field.value} onAccept={field.onChange} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" />{errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}</div>
                                            )} />
                                            <Controller name="birthDate" control={control} render={({ field }) => (
                                                <div><Label htmlFor="birthDate">Data de Nascimento *</Label><Input id="birthDate" type="date" {...field} />{errors.birthDate && <p className="text-sm text-destructive">{errors.birthDate.message}</p>}</div>
                                            )} />
                                            <Controller name="gender" control={control} render={({ field }) => (
                                                <div><Label htmlFor="gender">Gênero *</Label><Select onValueChange={field.onChange} value={field.value}><SelectTrigger id="gender"><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Masculino">Masculino</SelectItem><SelectItem value="Feminino">Feminino</SelectItem></SelectContent></Select>{errors.gender && <p className="text-sm text-destructive">{errors.gender.message}</p>}</div>
                                            )} />
                                            <Controller name="zipCode" control={control} render={({ field }) => (
                                                <div><Label htmlFor="zipCode">CEP</Label><div className='relative'><IMaskInput mask="00000-000" unmask={true} value={field.value || ''} onAccept={(value) => { field.onChange(value); handleCepSearch(value); }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50" disabled={isCepLoading} />{isCepLoading && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />}{errors.zipCode && <p className="text-sm text-destructive">{errors.zipCode.message}</p>}</div></div>
                                            )} />
                                            <Controller name="street" control={control} render={({ field }) => (
                                                <div className="md:col-span-2"><Label htmlFor="street">Endereço</Label><Input id="street" {...field} />{errors.street && <p className="text-sm text-destructive">{errors.street.message}</p>}</div>
                                            )} />
                                            <Controller name="number" control={control} render={({ field }) => (
                                                <div><Label htmlFor="number">Número</Label><Input id="number" {...field} />{errors.number && <p className="text-sm text-destructive">{errors.number.message}</p>}</div>
                                            )} />
                                            {/* CAMPO COMPLEMENTO ADICIONADO AQUI */}
                                            <Controller name="complement" control={control} render={({ field }) => (
                                                <div><Label htmlFor="complement">Complemento</Label><Input id="complement" placeholder="Ex: Apto 123, Bloco A" {...field} /></div>
                                            )} />
                                            <Controller name="neighborhood" control={control} render={({ field }) => (
                                                <div><Label htmlFor="neighborhood">Bairro</Label><Input id="neighborhood" {...field} />{errors.neighborhood && <p className="text-sm text-destructive">{errors.neighborhood.message}</p>}</div>
                                            )} />
                                            <Controller name="city" control={control} render={({ field }) => (
                                                <div><Label htmlFor="city">Cidade</Label><Input id="city" {...field} />{errors.city && <p className="text-sm text-destructive">{errors.city.message}</p>}</div>
                                            )} />
                                            <Controller name="state" control={control} render={({ field }) => (
                                                <div><Label htmlFor="state">Estado</Label><Input id="state" {...field} />{errors.state && <p className="text-sm text-destructive">{errors.state.message}</p>}</div>
                                            )} />
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                            <div><p className="text-sm font-medium text-muted-foreground">Nome</p><p className="text-base">{userProfile?.displayName || 'Não informado'}</p></div>
                                            <div><p className="text-sm font-medium text-muted-foreground">Email</p><p className="text-base">{userProfile?.email || 'Não informado'}</p></div>
                                            <div><p className="text-sm font-medium text-muted-foreground">CPF</p><p className="text-base">{userProfile?.cpf || 'Não informado'}</p></div>
                                            <div><p className="text-sm font-medium text-muted-foreground">Telefone</p><p className="text-base">{userProfile?.phone || 'Não informado'}</p></div>
                                            <div><p className="text-sm font-medium text-muted-foreground">Data de Nascimento</p><p className="text-base">{userProfile?.birthDate ? new Date(userProfile.birthDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Não informado'}</p></div>
                                            <div><p className="text-sm font-medium text-muted-foreground">Gênero</p><p className="text-base">{userProfile?.gender || 'Não informado'}</p></div>
                                            <div className="md:col-span-2"><p className="text-sm font-medium text-muted-foreground">Endereço</p>
                                                <p className="text-base">
                                                    {[
                                                        userProfile?.address?.street,
                                                        userProfile?.address?.number,
                                                        userProfile?.address?.complement,
                                                        userProfile?.address?.neighborhood,
                                                    ].filter(Boolean).join(', ')}
                                                    {userProfile?.address?.city && ` - ${userProfile?.address?.city}`}
                                                    {userProfile?.address?.state && `/${userProfile?.address?.state}`}
                                                    {!userProfile?.address?.street && 'Não informado'}
                                                </p>
                                            </div>
                                        </div>
                                    )
                                )}
                            </div>
                        </div>

                        {isEditing && (
                            <div className="mt-6 flex justify-end">
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                    Salvar Alterações
                                </Button>
                            </div>
                        )}
                    </div>
                </form>

                {userProfile?.role === 'doctor' && (
                    <>
                        <Separator className="my-8" />
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold">Informações da Clínica</h3>
                            {userProfile.clinic?.name && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">Nome da Clínica</p>
                                    <p className="text-base font-semibold">{userProfile.clinic.name}</p>
                                </div>
                            )}
                            <ClinicLogoUploader onUploadSuccess={handleLogoUpdate} />
                        </div>
                    </>
                )}
            </ScrollArea>
        </>
    );
}
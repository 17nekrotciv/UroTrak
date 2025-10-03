"use client";

import React, { useState, useRef } from 'react';
import { useData } from '@/contexts/data-provider';
import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, ImageIcon, X } from 'lucide-react'; // Ícones adicionados
import Image from 'next/image';

type ClinicLogoUploaderProps = {
    onUploadSuccess: (newLogoUrl: string) => void;
};

export default function ClinicLogoUploader({ onUploadSuccess }: ClinicLogoUploaderProps) {
    const { userProfile, updateClinicInfo } = useData();
    const { toast } = useToast();

    // Estados para o arquivo e controle de UI
    const [file, setFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Lógica de permissão (mantida igual)
    if (!userProfile?.clinic?.ownerId || userProfile.uid !== userProfile.clinic.ownerId) {
        return null; // Oculta o componente se não for o dono
    }

    // Função para lidar com a seleção do arquivo
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);

            // Gera uma URL local para a pré-visualização instantânea
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(selectedFile);
        }
    };

    // Limpa a seleção de arquivo
    const clearFileSelection = () => {
        setFile(null);
        setPreviewUrl(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Reseta o input de arquivo
        }
    }

    // Função para fazer o upload (lógica principal mantida)
    const handleUpload = async () => {
        if (!file || !userProfile.clinicId) return;

        setUploading(true);
        try {
            const storagePath = `logos/${userProfile.clinicId}/logo`;
            const storageRef = ref(storage, storagePath);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(snapshot.ref);

            await updateClinicInfo({ logoUrl: downloadURL });

            onUploadSuccess(downloadURL);

            toast({ title: "Sucesso!", description: "O logo da clínica foi atualizado." });
            clearFileSelection();
        } catch (error) {
            console.error("Erro no upload:", error);
            toast({ title: "Erro!", description: "Não foi possível enviar o logo.", variant: "destructive" });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="rounded-lg border bg-card/50 p-6">
            <div className="flex flex-col sm:flex-row items-start gap-6 sm:gap-8">

                {/* Coluna 1: Área de Upload e Pré-visualização */}
                <div className="flex-shrink-0 w-full sm:w-40 text-center">
                    <p className="text-sm font-medium text-muted-foreground mb-2">
                        Logo da Clínica
                    </p>
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="relative w-full sm:w-40 h-40 rounded-lg border-2 border-dashed border-muted hover:border-primary transition-colors cursor-pointer flex items-center justify-center group bg-background"
                    >
                        {previewUrl || userProfile.clinic?.logoUrl ? (
                            <Image
                                src={previewUrl || userProfile.clinic.logoUrl!}
                                alt="Prévia do logo"
                                layout="fill"
                                objectFit="contain"
                                className="rounded-md p-2"
                            />
                        ) : (
                            <div className="text-center text-muted-foreground text-xs space-y-1 p-4">
                                <ImageIcon className="w-10 h-10 mx-auto" />
                                <span>Clique ou arraste para selecionar</span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/60 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <Upload className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <Input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={handleFileChange}
                        disabled={uploading}
                        className="hidden"
                    />
                </div>

                {/* Coluna 2: Ações e Informações */}
                <div className="flex-grow w-full pt-2">
                    <h4 className="font-semibold text-card-foreground">
                        {file ? "Arquivo pronto para envio" : "Fazer upload de uma nova imagem"}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1 mb-4">
                        {file ? (
                            <span className="font-mono bg-muted py-1 px-2 rounded text-xs">{file.name}</span>
                        ) : (
                            "A logo aparecerá nos seus relatórios e documentos."
                        )}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-2">
                        <Button onClick={handleUpload} disabled={!file || uploading} className="flex-grow sm:flex-grow-0">
                            {uploading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Upload className="mr-2 h-4 w-4" />
                            )}
                            {uploading ? "Enviando..." : "Salvar Logo"}
                        </Button>

                        {file && (
                            <Button
                                variant="ghost"
                                onClick={clearFileSelection}
                                disabled={uploading}
                            >
                                <X className="mr-2 h-4 w-4" />
                                Cancelar
                            </Button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
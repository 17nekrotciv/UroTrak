import { useState, useCallback } from 'react';
import { UseFormSetValue, UseFormSetFocus } from 'react-hook-form';
import { useToast } from '@/hooks/use-toast';

// Tipagem para as props do hook
interface CepAutocompleteProps {
    setValue: UseFormSetValue<any>;
    setFocus: UseFormSetFocus<any>;
}

export function useCepAutocomplete({ setValue, setFocus }: CepAutocompleteProps) {
    const [isCepLoading, setIsCepLoading] = useState(false);
    const { toast } = useToast();

    const handleCepSearch = useCallback(async (cep: string) => {
        if (cep.length !== 8) return;
        setIsCepLoading(true);
        try {
            const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
            const data = await response.json();

            if (data.erro) {
                toast({ title: "CEP não encontrado", variant: "destructive" });
                // Opcional: Limpar os campos se o CEP for inválido
                setValue('street', '');
                setValue('neighborhood', '');
                setValue('city', '');
                setValue('state', '');
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

    return { isCepLoading, handleCepSearch };
}
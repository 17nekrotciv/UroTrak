'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MailPlus, CheckCircle, Loader2 } from 'lucide-react';
import { useData } from '@/contexts/data-provider';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { IMaskInput } from 'react-imask';

const PHONE_PREFIXES = [
  { value: '+55', label: '🇧🇷 +55 (Brasil)' },
  { value: '+1', label: '🇺🇸 +1 (EUA)' },
  // adicione mais conforme necessário
];

const callSignUpFunction = async (phoneNumber: string, clinicId: string) => {
  const cloudFunctionUrl = 'https://createsignup-qhzudkm4pq-uc.a.run.app';
  const response = await fetch(cloudFunctionUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber, clinicId }),
  });
  if (!response.ok) throw new Error(`Erro ${response.status}`);
  return response.json();
};

interface InviteByPhoneModalProps {
  children: React.ReactNode;
}

export const InviteByPhoneModal = ({ children }: InviteByPhoneModalProps) => {
  const { userProfile } = useData();
  const [phonePrefix, setPhonePrefix] = useState(PHONE_PREFIXES[0].value);
  const [rawPhoneNumber, setRawPhoneNumber] = useState(''); // só dígitos, sem máscara
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const clinicId = userProfile?.clinicId;

  const handleInvite = async () => {
    const fullPhoneNumber = phonePrefix + rawPhoneNumber.replace(/\D/g, '');
    // validações básicas por prefixo
    if (!rawPhoneNumber) {
      setStatus('error');
      setMessage('Preencha o número de telefone.');
      return;
    }
    if (
      phonePrefix === '+55' &&
      rawPhoneNumber.replace(/\D/g, '').length !== 11
    ) {
      setStatus('error');
      setMessage('Número brasileiro deve ter 11 dígitos (DDD + 9 dígitos).');
      return;
    }
    if (
      phonePrefix === '+1' &&
      rawPhoneNumber.replace(/\D/g, '').length !== 10
    ) {
      setStatus('error');
      setMessage('Número dos EUA deve ter 10 dígitos (DDD + número).');
      return;
    }
    if (!clinicId) {
      setStatus('error');
      setMessage('Clinic ID ausente.');
      return;
    }

    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      await callSignUpFunction(fullPhoneNumber, clinicId);
      setStatus('success');
      setMessage(`Convite enviado para ${fullPhoneNumber}`);
      setRawPhoneNumber('');
    } catch (err: any) {
      setStatus('error');
      setMessage(`Erro ao enviar: ${err?.message ?? 'Tente novamente'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // determina a máscara do IMask dependendo do prefixo
  const getMaskByPrefix = (prefix: string) => {
    if (prefix === '+55') return '(00) 00000-0000';
    if (prefix === '+1') return '(000) 000-0000';
    return '0000000000';
  };

  return (
    <Dialog onOpenChange={(open) => !open && setStatus('idle')}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Convidar Paciente por Telefone</DialogTitle>
          <DialogDescription>
            Selecione o código do país e insira o número do paciente.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex gap-2">
            <Select
              value={phonePrefix}
              onValueChange={(v) => setPhonePrefix(v)}
              disabled={isLoading}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Prefixo" />
              </SelectTrigger>
              <SelectContent>
                {PHONE_PREFIXES.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* IMaskInput como wrapper - unmask=true para receber apenas os dígitos */}
            <IMaskInput
              mask={getMaskByPrefix(phonePrefix)}
              unmask={true}
              value={rawPhoneNumber}
              onAccept={(v: string) => setRawPhoneNumber(v)}
              type="tel"
              placeholder={
                phonePrefix === '+55' ? '(11) 99999-9999' : '(000) 000-0000'
              }
              disabled={isLoading}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {status === 'success' && (
            <div className="flex items-center text-green-600">
              <CheckCircle className="mr-2 h-4 w-4" />
              <p className="text-sm font-medium">{message}</p>
            </div>
          )}
          {status === 'error' && (
            <p className="text-sm font-medium text-red-600">{message}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleInvite}
            disabled={isLoading || status === 'success'}
          >
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <MailPlus className="mr-2 h-4 w-4" />
            )}
            {isLoading ? 'Enviando...' : 'Enviar Link de Cadastro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

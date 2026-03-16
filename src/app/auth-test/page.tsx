'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

export default function AuthTestPage() {
  const { authUser, user, logout } = useAuth();
  const [localStorageKeys, setLocalStorageKeys] = useState<string[]>([]);
  const [firebaseKeys, setFirebaseKeys] = useState<string[]>([]);

  const scanLocalStorage = () => {
    const allKeys: string[] = [];
    const fbKeys: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allKeys.push(key);
        if (key.startsWith('firebase:')) {
          fbKeys.push(key);
        }
      }
    }
    
    setLocalStorageKeys(allKeys);
    setFirebaseKeys(fbKeys);
  };

  useEffect(() => {
    scanLocalStorage();
  }, [authUser, user]);

  const handleLogout = async () => {
    await logout();
    // Escaneia novamente após logout
    setTimeout(() => scanLocalStorage(), 1000);
  };

  const clearAllLocalStorage = () => {
    localStorage.clear();
    scanLocalStorage();
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Teste de Autenticação e Sessão</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Status da Autenticação */}
        <Card>
          <CardHeader>
            <CardTitle>Status do Firebase Auth</CardTitle>
            <CardDescription>Estado atual da autenticação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Firebase User:</span>
              {authUser ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Autenticado
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Não autenticado
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Firestore Profile:</span>
              {user ? (
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Carregado
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <XCircle className="h-3 w-3" />
                  Não carregado
                </Badge>
              )}
            </div>

            {authUser && (
              <div className="pt-4 border-t space-y-2 text-sm">
                <p><strong>UID:</strong> {authUser.uid}</p>
                <p><strong>Email:</strong> {authUser.email}</p>
                <p><strong>Display Name:</strong> {authUser.displayName || 'N/A'}</p>
              </div>
            )}

            {user && (
              <div className="pt-4 border-t space-y-2 text-sm">
                <p><strong>Role:</strong> {user.role}</p>
                <p><strong>Clinic ID:</strong> {user.clinicId || 'N/A'}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* LocalStorage */}
        <Card>
          <CardHeader>
            <CardTitle>LocalStorage</CardTitle>
            <CardDescription>Chaves armazenadas no navegador</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total de chaves:</span>
              <Badge variant="outline">{localStorageKeys.length}</Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Chaves Firebase:</span>
              <Badge variant={firebaseKeys.length > 0 ? 'default' : 'secondary'}>
                {firebaseKeys.length}
              </Badge>
            </div>

            {firebaseKeys.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-xs font-medium mb-2">Chaves Firebase encontradas:</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {firebaseKeys.map((key) => (
                    <div key={key} className="text-xs font-mono bg-muted p-1 rounded truncate">
                      {key}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4 flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={scanLocalStorage}
                className="gap-1"
              >
                <RefreshCw className="h-3 w-3" />
                Atualizar
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={clearAllLocalStorage}
              >
                Limpar tudo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Ações de Teste</CardTitle>
          <CardDescription>
            Teste o logout e verifique se a sessão é encerrada corretamente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Ao clicar em &quot;Fazer Logout&quot;, você deve:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Ser redirecionado para a página de login</li>
              <li>As chaves do Firebase no localStorage devem ser removidas</li>
              <li>O status de autenticação deve mudar para &quot;Não autenticado&quot;</li>
            </ul>
          </div>

          {authUser && (
            <Button 
              onClick={handleLogout} 
              variant="destructive"
              className="w-full md:w-auto"
            >
              Fazer Logout
            </Button>
          )}

          {!authUser && (
            <p className="text-sm text-muted-foreground">
              ✅ Você não está autenticado. A sessão foi encerrada com sucesso!
            </p>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card className="mt-6 border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-blue-900">ℹ️ Como testar</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-900 space-y-2">
          <p><strong>Passo 1:</strong> Faça login normalmente</p>
          <p><strong>Passo 2:</strong> Acesse esta página (/auth-test)</p>
          <p><strong>Passo 3:</strong> Verifique as informações de autenticação e localStorage</p>
          <p><strong>Passo 4:</strong> Clique em &quot;Fazer Logout&quot;</p>
          <p><strong>Passo 5:</strong> Verifique se foi redirecionado para /login</p>
          <p><strong>Passo 6:</strong> Tente acessar esta página novamente - você deve ser redirecionado para /login</p>
          <p className="pt-2 border-t">
            <strong>Teste adicional:</strong> Após logout, feche o navegador, abra novamente e tente 
            acessar /dashboard - você deve ser redirecionado para /login, confirmando que a sessão 
            foi realmente encerrada.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

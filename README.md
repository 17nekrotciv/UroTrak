# UroTrack - Acompanhamento Pós-Prostatectomia

Este é o projeto para o UroTrack, um aplicativo desenvolvido com Next.js, Firebase e ShadCN UI para ajudar pacientes no acompanhamento da recuperação após prostatectomia radical.

## Configuração do Firebase (Passos Críticos)

Para que o aplicativo funcione, é **essencial** que a conexão com o Firebase esteja configurada corretamente. Erros comuns como `400 Bad Request` ou `client is offline` indicam um problema em um dos passos abaixo. Por favor, revise cada um deles com atenção.

### Passo 1: Habilitar o Firestore e a Autenticação

1.  **Habilite o Firestore:**
    *   Vá para o [Console do Firebase](https://console.firebase.google.com/) e selecione seu projeto.
    *   No menu "Construir", clique em **Firestore Database**.
    *   Clique em **"Criar banco de dados"**.
    *   Escolha iniciar no **Modo de Produção** (ele começa com regras seguras que vamos atualizar depois).
    *   Selecione uma localização para o seu banco de dados (ex: `southamerica-east1` para São Paulo) e clique em "Ativar".

2.  **Habilite a Autenticação:**
    *   No menu "Construir", clique em **Authentication**.
    *   Vá para a aba **"Sign-in method"**.
    *   Habilite os provedores que você deseja usar (pelo menos **"E-mail/senha"** e **"Google"**).

### Passo 2: Copiar as Credenciais para o Arquivo `.env.local`

1.  **Encontre suas credenciais:**
    *   No Console do Firebase, clique no ícone de engrenagem ⚙️ e vá para **"Configurações do projeto"**.
    *   Na aba "Geral", role para baixo até "Seus apps".
    *   Clique no ícone `</>` para ver o código de configuração do seu app da Web.
    *   Você verá um objeto `firebaseConfig`.
2.  **Crie o arquivo .env.local e cole as credenciais**: Na raiz do seu projeto, crie um arquivo chamado `.env.local` e cole os valores do objeto `firebaseConfig`, garantindo que cada variável corresponda ao exemplo abaixo.

    ```env
    # O seu arquivo .env.local deve ficar assim, com SEUS valores:
    NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="seu-projeto"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="seu-projeto.appspot.com"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="1234567890"
    NEXT_PUBLIC_FIREBASE_APP_ID="1:1234567890:web:abcdef123456"
    ```
3.  **Reinicie o Servidor:** Após salvar o `.env.local`, **pare (Ctrl+C) e reinicie (`npm run dev`)** o seu servidor de desenvolvimento.

### Passo 3: Atualizar as Regras de Segurança (MUITO IMPORTANTE)

Esta é a causa mais comum de erros de permissão e conexão.

1.  Acesse o [Console do Firebase](https://console.firebase.google.com/) e navegue até seu projeto.
2.  No menu de construção à esquerda, vá para **Firestore Database**.
3.  Clique na aba **Regras** no topo.
4.  Copie **todo o conteúdo** abaixo e cole no editor de regras do Firebase, **substituindo completamente** as regras existentes.

    ```
    rules_version = '2';

    service cloud.firestore {
      match /databases/{database}/documents {
        
        // This rule allows ANYONE to read this specific document.
        // It's used as a "health check" to test the connection from the client.
        match /health_checks/status {
          allow read: if true;
        }

        // This rule secures all user documents.
        // It ensures a user can only read or write to their own data.
        match /users/{userId}/{document=**} {
          allow read, write: if request.auth != null && request.auth.uid == userId;
        }
      }
    }
    ```

5.  Clique em **Publicar**. As alterações podem levar alguns segundos para serem aplicadas.

## Desenvolvimento Local

```bash
# 1. Instale as dependências
npm install

# 2. Siga os passos de configuração do Firebase acima

# 3. Rode o servidor de desenvolvimento
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no seu navegador para ver o aplicativo em execução. Na página de login, você encontrará um botão para testar a conexão com o Firebase, que pode ajudar a diagnosticar problemas de configuração.

## Deploy

### Deploy do Código do Aplicativo (App Hosting)

Quando estiver pronto para publicar suas alterações no aplicativo, execute o seguinte comando na raiz do seu projeto:
```bash
firebase deploy --only hosting
```

### Deploy das Regras do Banco de Dados (Firestore)

Se você alterar o arquivo `firestore.rules`, pode fazer o deploy das novas regras com este comando:
```bash
firebase deploy --only firestore
```

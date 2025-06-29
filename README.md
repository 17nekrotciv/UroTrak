# UroTrack - Acompanhamento Pós-Prostatectomia

Este é o projeto para o UroTrack, um aplicativo desenvolvido com Next.js, Firebase e ShadCN UI para ajudar pacientes no acompanhamento da recuperação após prostatectomia radical.

## Configuração do Firebase (Passos Críticos)

Para que o aplicativo funcione, é **essencial** que a conexão com o Firebase esteja configurada corretamente. O erro `400 Bad Request` que você está vendo indica um problema em um dos passos abaixo. Por favor, revise cada um deles com atenção:

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

1.  **Crie o arquivo de credenciais:** Na raiz do seu projeto, renomeie (ou copie) o arquivo `.env.example` para um novo arquivo chamado `.env.local`. **É importante que o nome seja `.env.local`**.
2.  **Encontre suas credenciais:**
    *   No Console do Firebase, clique no ícone de engrenagem ⚙️ e vá para **"Configurações do projeto"**.
    *   Na aba "Geral", role para baixo até "Seus apps".
    *   Clique no ícone `</>` para ver o código de configuração do seu app da Web.
    *   Você verá um objeto `firebaseConfig`.
3.  **Copie e cole CADA valor** do objeto `firebaseConfig` para o seu arquivo `.env.local`, garantindo que cada variável corresponda.

    ```javascript
    // Exemplo do que você verá no Firebase
    const firebaseConfig = {
      apiKey: "AIza...",
      authDomain: "seu-projeto.firebaseapp.com",
      // ...e assim por diante
    };
    ```

    ```env
    # O seu arquivo .env.local deve ficar assim, com SEUS valores:
    NEXT_PUBLIC_FIREBASE_API_KEY="AIza..."
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="seu-projeto.firebaseapp.com"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="seu-projeto"
    # ... e assim por diante
    ```
4.  **Reinicie o Servidor:** Após salvar o `.env.local`, **pare (Ctrl+C) e reinicie (`npm run dev`)** o seu servidor de desenvolvimento.

### Passo 3: Atualizar as Regras de Segurança

Esta é a causa mais comum de erros de permissão.

1.  Acesse o [Console do Firebase](https://console.firebase.google.com/) e navegue até seu projeto.
2.  No menu de construção à esquerda, vá para **Firestore Database**.
3.  Clique na aba **Regras** no topo.
4.  Copie **todo o conteúdo** do arquivo `firestore.rules` que está no seu projeto.
5.  Cole o conteúdo no editor de regras do Firebase, **substituindo completamente** as regras existentes.
6.  Clique em **Publicar**. As alterações podem levar alguns segundos para serem aplicadas.

## Desenvolvimento Local

Se você já clonou o projeto do GitHub, siga estas instruções para configurar e rodar o projeto em sua máquina local.

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Firebase CLI](https://firebase.google.com/docs/cli) instalado globalmente (`npm install -g firebase-tools`)

### 1. Clone o Projeto

Se você ainda não clonou, use o comando abaixo substituindo a URL:

```bash
git clone <URL_DO_SEU_REPOSITÓRIO>
cd <NOME_DA_PASTA_DO_PROJETO>
```

### 2. Instale as Dependências

Use o `npm` para instalar todas as dependências do projeto:

```bash
npm install
```

### 3. Configure as Variáveis de Ambiente e Regras

Siga **todos os passos** da seção "Configuração do Firebase (Passos Críticos)" acima.

### 4. Rode o Servidor de Desenvolvimento

Agora você está pronto para iniciar o servidor de desenvolvimento do Next.js:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) (ou a porta que o Next.js indicar) no seu navegador para ver o aplicativo em execução.

## Vinculando a um Repositório GitHub (Primeira Vez)

Se você iniciou este projeto localmente e ainda não o conectou a um repositório no GitHub, siga estes passos:

1.  **Crie um Repositório no GitHub:**
    *   Vá para [GitHub](https://github.com/new).
    *   Dê um nome ao seu repositório (ex: `urotrack-app`).
    *   **Importante:** Não inicialize o novo repositório com `README`, `.gitignore` ou licença. Seu projeto já possui esses arquivos. Deixe-o vazio.
    *   Clique em "Create repository".

2.  **Execute os Comandos no Seu Terminal:**
    Abra o terminal na pasta raiz do seu projeto e execute os seguintes comandos. Copie a URL do seu novo repositório do GitHub (será algo como `https://github.com/seu-usuario/urotrack-app.git`).

    ```bash
    # Inicializa o Git no seu projeto (se ainda não foi feito)
    git init -b main

    # Adiciona todos os arquivos para o Git
    git add .

    # Cria o primeiro "commit" (um snapshot do seu código)
    git commit -m "Primeiro commit: configuração inicial do projeto UroTrack"

    # Vincula seu projeto local ao repositório remoto no GitHub (substitua a URL)
    git remote add origin https://github.com/seu-usuario/urotrack-app.git

    # Envia (push) seu código para o GitHub
    git push -u origin main
    ```

    Agora seu código está no GitHub!

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

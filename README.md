# UroTrack - Acompanhamento Pós-Prostatectomia

Este é o projeto para o UroTrack, um aplicativo desenvolvido com Next.js, Firebase e ShadCN UI para ajudar pacientes no acompanhamento da recuperação após prostatectomia radical.

## Primeiros Passos (Desenvolvimento Local)

Siga estas instruções para configurar e rodar o projeto em sua máquina local para desenvolvimento e testes.

### Pré-requisitos

- [Node.js](https://nodejs.org/) (versão 18 ou superior)
- [Firebase CLI](https://firebase.google.com/docs/cli) instalado globalmente (`npm install -g firebase-tools`)

### 1. Clone o Projeto

Primeiro, clone este repositório para a sua máquina local:

```bash
git clone <URL_DO_SEU_REPOSITÓRIO>
cd <NOME_DA_PASTA_DO_PROJETO>
```

### 2. Instale as Dependências

Use o `npm` para instalar todas as dependências do projeto:

```bash
npm install
```

### 3. Configure as Variáveis de Ambiente

Para conectar o aplicativo ao seu projeto Firebase, você precisa fornecer as credenciais.

1.  Renomeie o arquivo `.env.example` para `.env.local`.
2.  Acesse o [Console do Firebase](https://console.firebase.google.com/).
3.  Vá para "Configurações do Projeto" (ícone de engrenagem ⚙️).
4.  Na aba "Geral", em "Seus apps", encontre e copie as credenciais do seu aplicativo da Web.
5.  Cole os valores correspondentes no seu arquivo `.env.local`.

### 4. Rode o Servidor de Desenvolvimento

Agora você está pronto para iniciar o servidor de desenvolvimento do Next.js:

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) (ou a porta que o Next.js indicar) no seu navegador para ver o aplicativo em execução.

## Integração com VS Code

Este projeto está configurado para uma ótima experiência no Visual Studio Code.

- **Formatação Automática:** O código será formatado automaticamente ao salvar, graças à integração com o Prettier.
- **Extensões Recomendadas:** Considere instalar as seguintes extensões no VS Code para uma melhor produtividade:
  - `dbaeumer.vscode-eslint`
  - `esbenp.prettier-vscode`
  - `bradlc.vscode-tailwindcss`

## Deploy com Firebase App Hosting

Este projeto está configurado para fazer deploy facilmente usando o Firebase App Hosting.

1.  **Login no Firebase:**
    Se for a primeira vez, faça login na sua conta do Google:
    ```bash
    firebase login
    ```

2.  **Faça o Deploy:**
    Quando estiver pronto para publicar suas alterações, execute o seguinte comando na raiz do seu projeto:
    ```bash
    firebase deploy --only hosting
    ```

O Firebase CLI irá compilar seu projeto Next.js e fazer o deploy para o App Hosting. Ao final, ele fornecerá a URL do seu aplicativo publicado.

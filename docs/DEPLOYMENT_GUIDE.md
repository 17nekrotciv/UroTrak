# Guia de Deploy - Sistema de Assinaturas

## 📋 Pré-requisitos

Antes de fazer o deploy, você precisa:
- Conta no Stripe (modo de teste ou produção)
- Projeto Firebase configurado (urotrack-qqp6e)
- Firebase CLI instalado (`npm install -g firebase-tools`)
- Acesso ao Console do Firebase

---

## 1️⃣ Configurar Chaves do Stripe

### 1.1 Obter Chaves de API

1. Acesse https://dashboard.stripe.com/test/apikeys
2. Copie a **Secret key** (começa com `sk_test_...`)

### 1.2 Configurar Webhook

1. Acesse https://dashboard.stripe.com/test/webhooks
2. Clique em **Add endpoint**
3. Configure:
   - **Endpoint URL**: `https://us-central1-urotrack-qqp6e.cloudfunctions.net/stripeWebhook`
   - **Events to send**: Selecione:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Clique em **Add endpoint**
5. Copie o **Signing secret** (começa com `whsec_...`)

---

## 2️⃣ Configurar Variáveis de Ambiente

### Para Desenvolvimento Local

Edite o arquivo `functions/.env`:

```env
STRIPE_SECRET_KEY=sk_test_SUA_CHAVE_AQUI
STRIPE_WEBHOOK_SECRET=whsec_SUA_CHAVE_AQUI
APP_URL=http://localhost:3000
```

### Para Produção (Firebase Functions)

Execute no terminal (dentro da pasta `functions`):

```bash
firebase functions:config:set stripe.secret_key="sk_test_SUA_CHAVE_AQUI"
firebase functions:config:set stripe.webhook_secret="whsec_SUA_CHAVE_AQUI"
firebase functions:config:set app.url="https://SEU_DOMINIO.com"
```

Para verificar se foi configurado corretamente:

```bash
firebase functions:config:get
```

---

## 3️⃣ Configurar Firestore Rules

Como estamos usando o banco de dados nomeado `uritrak`, as regras **NÃO podem ser deployadas via CLI**. É necessário configurar manualmente:

1. Acesse https://console.firebase.google.com/project/urotrack-qqp6e/firestore/databases
2. Selecione o banco de dados **uritrak** no dropdown
3. Clique na aba **Rules**
4. Copie o conteúdo do arquivo `firestore.rules` do projeto
5. Cole no editor de regras do Console
6. Clique em **Publish**

### Conteúdo das Rules (já implementado em `firestore.rules`):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Regras para usuários
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Regras para assinaturas
    match /subscriptions/{subscriptionId} {
      allow read: if request.auth != null && request.auth.uid == resource.data.user;
      allow write: if false; // Apenas Cloud Functions podem escrever
    }
    
    // Health check endpoint
    match /health_checks/status {
      allow read: if true;
    }
  }
}
```

---

## 4️⃣ Deploy das Cloud Functions

### 4.1 Compilar TypeScript

```bash
cd functions
npm run build
```

### 4.2 Deploy das Funções

Deploy de todas as funções:

```bash
firebase deploy --only functions
```

Ou deploy de funções específicas:

```bash
firebase deploy --only functions:createStripeCheckout,functions:stripeWebhook
```

---

## 5️⃣ Testar Localmente (Opcional)

### 5.1 Usar Emuladores do Firebase

```bash
firebase emulators:start --only functions,firestore
```

### 5.2 Testar Webhook Localmente com Stripe CLI

Instale o Stripe CLI: https://stripe.com/docs/stripe-cli

```bash
stripe login
stripe listen --forward-to http://localhost:5001/urotrack-qqp6e/us-central1/stripeWebhook
```

---

## 6️⃣ Atualizar Links de Pagamento do Stripe

Após o deploy, você precisa atualizar os links de pagamento para apontarem para as URLs corretas:

1. Acesse https://dashboard.stripe.com/test/payment-links
2. Para cada plano (Mensal R$10 e Trimestral R$25), edite:
   - **Success URL**: `https://SEU_DOMINIO.com/dashboard/success?session_id={CHECKOUT_SESSION_ID}`
   - **Cancel URL**: `https://SEU_DOMINIO.com/pricing`

---

## 7️⃣ Verificar Deploy

### Testar Funções

1. Acesse https://console.firebase.google.com/project/urotrack-qqp6e/functions
2. Verifique se as funções `createStripeCheckout` e `stripeWebhook` estão ativas

### Testar Webhook

1. Faça um pagamento de teste no Stripe
2. Verifique em https://dashboard.stripe.com/test/webhooks se o webhook foi executado com sucesso
3. Verifique no Firestore se a assinatura foi criada na coleção `subscriptions`

### Testar Frontend

1. Acesse `/pricing` no seu site
2. Clique em um plano pago
3. Complete o checkout no Stripe (use cartão de teste: `4242 4242 4242 4242`)
4. Verifique se a página detectou o pagamento automaticamente
5. Acesse `/dashboard/subscriptions` para ver o histórico

---

## 🧪 Cartões de Teste do Stripe

- **Sucesso**: `4242 4242 4242 4242`
- **Pagamento recusado**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Use qualquer data futura e qualquer CVC de 3 dígitos.

---

## 🔧 Solução de Problemas

### Erro: "Neither apiKey nor config.authenticator provided"

As variáveis de ambiente não foram configuradas. Execute:

```bash
firebase functions:config:set stripe.secret_key="sk_test_..."
firebase deploy --only functions
```

### Erro: "Webhook signature verification failed"

O `STRIPE_WEBHOOK_SECRET` está incorreto. Verifique em:
https://dashboard.stripe.com/test/webhooks

### Subscription não é criada no Firestore

1. Verifique os logs da função: `firebase functions:log`
2. Verifique se o webhook está recebendo o evento `checkout.session.completed`
3. Verifique as regras do Firestore

---

## 📊 Monitoramento

### Logs das Functions

```bash
firebase functions:log
```

### Métricas do Stripe

https://dashboard.stripe.com/test/dashboard

---

## 🚀 Próximos Passos

1. ✅ Configurar chaves do Stripe
2. ✅ Configurar variáveis de ambiente
3. ✅ Deploy das Firestore Rules (manual)
4. ✅ Deploy das Cloud Functions
5. ✅ Atualizar links de pagamento
6. ✅ Testar fluxo completo
7. 🔄 Migrar para modo de produção quando estiver pronto

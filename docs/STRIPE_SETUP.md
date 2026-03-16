# Configuração do Stripe

Este documento descreve como configurar a integração com o Stripe para gerenciar assinaturas no UroTrack.

## Passo 1: Criar conta no Stripe

1. Acesse [https://stripe.com](https://stripe.com) e crie uma conta
2. Após criar a conta, acesse o [Dashboard do Stripe](https://dashboard.stripe.com)

## Passo 2: Criar produtos e preços

1. No Dashboard do Stripe, vá para **Produtos** > **Criar produto**
2. Crie os seguintes produtos:

### Plano Mensal
- Nome: UroTrack Mensal
- Descrição: Plano de assinatura mensal
- Preço: R$ 10,00/mês
- Produto recorrente: Sim
- Intervalo de cobrança: Mensal
- Copie o **Price ID** (começa com `price_`)
- **Crie um Payment Link** (recomendado):
  - Clique em "Create payment link"
  - Em "Customer information", marque "Collect tax IDs" se necessário
  - Em "After payment", configure para redirecionar para: `https://seudominio.com/dashboard/success`
  - Copie o **Payment Link** gerado (começa com `https://buy.stripe.com/`)
  - ⚠️ **IMPORTANTE**: Adicione `?client_reference_id={USER_ID}` ao final da URL
  - Exemplo: `https://buy.stripe.com/test_xxxxx?client_reference_id={USER_ID}`

### Plano Trimestral
- Nome: UroTrack Trimestral  
- Descrição: Plano de assinatura trimestral com desconto
- Preço: R$ 25,00 a cada 3 meses
- Produto recorrente: Sim
- Intervalo de cobrança: A cada 3 meses
- Copie o **Price ID** (começa com `price_`)
- **Crie um Payment Link** (recomendado):
  - Siga os mesmos passos do plano mensal
  - Copie o **Payment Link** gerado
  - ⚠️ **IMPORTANTE**: Adicione `?client_reference_id={USER_ID}` ao final da URL
  - Exemplo: `https://buy.stripe.com/test_xxxxx?client_reference_id={USER_ID}`

## Passo 3: Configurar variáveis de ambiente

### Frontend (Next.js)

Crie um arquivo `.env.local` na raiz da pasta `UroTrak`:

```env
# Stripe - Frontend
NEXT_PUBLIC_STRIPE_PRICE_MONTHLY=price_xxxxxxxxxxxxx
NEXT_PUBLIC_STRIPE_PRICE_QUARTERLY=price_xxxxxxxxxxxxx

# Payment Links (Recomendado - mais simples que checkout sessions)
# IMPORTANTE: Adicione ?client_reference_id={USER_ID} ao final da URL
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_MONTHLY=https://buy.stripe.com/test_xxxxxxxxxxxxx?client_reference_id={USER_ID}
NEXT_PUBLIC_STRIPE_PAYMENT_LINK_QUARTERLY=https://buy.stripe.com/test_xxxxxxxxxxxxx?client_reference_id={USER_ID}
```

**Nota:** 
- Os Payment Links **DEVEM** incluir `?client_reference_id={USER_ID}` para que o sistema possa identificar o usuário
- O placeholder `{USER_ID}` será substituído automaticamente pelo Firebase UID do usuário
- Se você configurar os Payment Links, eles terão prioridade sobre as checkout sessions via API

### Backend (Firebase Functions)

Configure as variáveis de ambiente no Firebase Functions:

```bash
cd functions

# Configurar chaves do Stripe
firebase functions:config:set stripe.secret_key="sk_test_xxxxxxxxxxxxx"
firebase functions:config:set stripe.webhook_secret="whsec_xxxxxxxxxxxxx"
firebase functions:config:set app.url="https://seudominio.com"

# Para desenvolvimento local, criar arquivo .env
# functions/.env
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
APP_URL=http://localhost:3000
```

## Passo 4: Configurar Webhook do Stripe

1. No Dashboard do Stripe, vá para **Developers** > **Webhooks**
2. Clique em **Add endpoint**
3. Configure:
   - **URL do endpoint**: `https://southamerica-east1-SEU_PROJECT_ID.cloudfunctions.net/stripeWebhook`
   - **Eventos a ouvir**: Selecione:
     - `checkout.session.completed` ⭐ (ESSENCIAL - cria registro na coleção subscriptions)
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
4. Após criar, copie o **Webhook signing secret** (começa com `whsec_`)
5. Adicione esse secret na configuração do Firebase Functions (passo anterior)

### 📝 O que acontece quando o checkout é completado:

Quando um usuário completa o pagamento no Stripe, o webhook `checkout.session.completed` é disparado e cria automaticamente um documento na coleção `subscriptions` do Firestore com:

```typescript
{
  amount: 10.00,              // Valor pago (em reais)
  currency: "BRL",            // Moeda
  payment_method: "card",     // Método de pagamento
  created_at: timestamp,      // Data/hora da criação
  user: "uid_do_usuario",     // UID do usuário Firebase
  customer_id: "cus_xxx",     // ID do customer no Stripe
  status: "active",           // Status da assinatura
  subscription_id: "sub_xxx", // ID da subscription no Stripe
  plan_id: "price_xxx",       // ID do price no Stripe
  session_id: "cs_xxx"        // ID da session de checkout
}
```

### ⚠️ IMPORTANTE: Configurar client_reference_id

Para que o webhook possa identificar qual usuário fez a compra, é **essencial** que o `client_reference_id` seja passado:

**Opção 1 - Payment Links (já configurado):**
O sistema já adiciona automaticamente `?client_reference_id=UID_DO_USUARIO` na URL do payment link.

**Opção 2 - Checkout Sessions via API:**
Ao criar uma checkout session programaticamente, o `client_reference_id` já é passado com o userId.

Não é necessária configuração adicional! ✅

## Passo 5: Testar a integração

### Modo de teste

1. Use as chaves de teste (`sk_test_` e `pk_test_`)
2. Use cartões de teste do Stripe:
   - Sucesso: `4242 4242 4242 4242`
   - Falha: `4000 0000 0000 0002`
   - Data de validade: qualquer data futura
   - CVC: qualquer 3 dígitos

### Teste local do webhook

Para testar webhooks localmente, use o Stripe CLI:

```bash
# Instalar Stripe CLI
# Windows: scoop install stripe
# Mac: brew install stripe/stripe-cli/stripe

# Fazer login
stripe login

# Encaminhar eventos para função local
stripe listen --forward-to http://localhost:5001/SEU_PROJECT_ID/southamerica-east1/stripeWebhook

# Em outro terminal, acionar eventos de teste
stripe trigger customer.subscription.created
```

## Passo 6: Ir para produção

1. No Dashboard do Stripe, ative sua conta completando todas as informações necessárias
2. Troque as chaves de teste pelas chaves de produção:
   - `sk_test_` → `sk_live_`
   - `pk_test_` → `pk_live_`
3. Atualize os Price IDs para os IDs de produção
4. Reconfigure o webhook com a URL de produção
5. Faça deploy das funções:

```bash
cd functions
npm run build
firebase deploy --only functions:createStripeCheckout,functions:stripeWebhook
```

## Estrutura de dados no Firestore

### Coleção `users` - Perfil do Usuário

Quando um usuário assina um plano, os seguintes dados são salvos no documento do usuário:

```typescript
{
  subscription: {
    status: 'active' | 'trialing' | 'past_due' | 'canceled',
    plan: 'free' | 'monthly' | 'quarterly',
    patientLimit: number,
    stripeCustomerId: string,
    subscriptionId: string,
    updatedAt: timestamp
  }
}
```

### Coleção `subscriptions` - Histórico de Assinaturas ⭐ NOVO

Cada vez que um pagamento é completado, um novo documento é criado nesta coleção:

```typescript
{
  amount: 10.00,              // Valor pago em reais
  currency: "BRL",            // Moeda (BRL, USD, etc)
  payment_method: "card",     // Método de pagamento usado
  created_at: timestamp,      // Data/hora da criação
  user: "uid_do_usuario",     // UID do usuário que fez a compra
  customer_id: "cus_xxx",     // Stripe Customer ID
  status: "active",           // Status da assinatura
  subscription_id: "sub_xxx", // Stripe Subscription ID
  plan_id: "price_xxx",       // Stripe Price ID do plano
  session_id: "cs_xxx"        // Stripe Checkout Session ID
}
```

Esta coleção permite:
- Rastrear todo o histórico de assinaturas de cada usuário
- Auditoria de pagamentos
- Análise de receita
- Relatórios financeiros

## Acessar a página de assinaturas

A página de assinaturas está disponível em:
- Desenvolvimento: `http://localhost:3000/pricing`
- Produção: `https://seudominio.com/pricing`

## Suporte

- [Documentação do Stripe](https://stripe.com/docs)
- [API Reference do Stripe](https://stripe.com/docs/api)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)

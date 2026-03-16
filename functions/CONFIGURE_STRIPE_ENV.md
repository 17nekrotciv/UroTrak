# Configuração de Variáveis de Ambiente do Stripe

## 1. Configurar as variáveis no Firebase Functions

Execute os seguintes comandos no terminal (dentro da pasta `functions`):

```bash
# Chave secreta da API do Stripe (encontre em: https://dashboard.stripe.com/apikeys)
firebase functions:secrets:set STRIPE_SECRET_KEY

# Secret do webhook (encontre em: https://dashboard.stripe.com/webhooks)
firebase functions:secrets:set STRIPE_WEBHOOK_SECRET

# URL base da aplicação (substitua pela URL do seu site)
firebase functions:config:set app.url="https://seu-dominio.com"
```

## 2. Como obter os valores:

### STRIPE_SECRET_KEY
1. Acesse: https://dashboard.stripe.com/apikeys
2. Copie a "Secret key" (começa com `sk_live_` ou `sk_test_`)

### STRIPE_WEBHOOK_SECRET
1. Acesse: https://dashboard.stripe.com/webhooks
2. Clique no webhook configurado (ou crie um novo)
3. Copie o "Signing secret" (começa com `whsec_`)
4. Configure o endpoint do webhook para: `https://us-central1-urotrack-qqp6e.cloudfunctions.net/stripeWebhook`

### APP_URL
- Para produção: `https://seu-dominio.com`
- Para desenvolvimento: `http://localhost:3000`

## 3. Atualizar o código para usar `app.url`

No stripeController.ts, a linha:
```typescript
const baseUrl = process.env.APP_URL || 'http://localhost:3000';
```

Deve ser alterada para:
```typescript
const baseUrl = functions.config().app?.url || 'http://localhost:3000';
```

## 4. Deploy após configurar

```bash
firebase deploy --only functions
```

## 5. Verificar variáveis configuradas

```bash
# Ver secrets
firebase functions:secrets:access STRIPE_SECRET_KEY
firebase functions:secrets:access STRIPE_WEBHOOK_SECRET

# Ver configurações
firebase functions:config:get
```

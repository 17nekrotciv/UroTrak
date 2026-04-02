# Função de Checkout Stripe para n8n

## Descrição

A função `createStripeCheckoutN8n` é uma Cloud Function HTTP que permite criar sessões de checkout do Stripe sem necessidade de autenticação Firebase. Esta função foi criada especificamente para integração com o n8n.

## Endpoint

```
POST https://us-central1-[PROJECT_ID].cloudfunctions.net/createStripeCheckoutN8n
```

## Diferenças da função original

| Aspecto | Função Original (`createStripeCheckout`) | Nova Função (`createStripeCheckoutN8n`) |
|---------|------------------------------------------|------------------------------------------|
| Tipo | Callable Function | HTTP Function |
| Autenticação | Requer Firebase Auth | Não requer |
| Método | Chamada via SDK | POST HTTP |
| CORS | Não necessário | Habilitado |
| UID | Vem do context.auth | Vem do body |

## Payload (Body JSON)

```json
{
  "uid": "ID_DO_USUARIO_FIREBASE",
  "couponCode": "CODIGO_CUPOM_OPCIONAL",
  "customerId": "CUSTOMER_ID_STRIPE_OPCIONAL"
}
```

### Parâmetros

- **uid** (obrigatório): O UID do usuário no Firebase
- **couponCode** (opcional): Código de cupom do Stripe para aplicar desconto
- **customerId** (opcional): ID do customer existente no Stripe

## Resposta de Sucesso

```json
{
  "success": true,
  "sessionId": "cs_test_a1B2c3...",
  "url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

## Resposta de Erro

```json
{
  "error": "invalid-argument",
  "message": "O UID do usuário é obrigatório."
}
```

### Códigos de Status HTTP

- `200`: Sucesso
- `400`: Payload inválido (UID ausente)
- `405`: Método não permitido (deve ser POST)
- `500`: Erro interno do servidor

## Exemplo de Uso no n8n

### 1. Usando o nó HTTP Request

```
Method: POST
URL: https://us-central1-[PROJECT_ID].cloudfunctions.net/createStripeCheckoutN8n
Authentication: None
Body (JSON):
{
  "uid": "{{ $json.userId }}",
  "couponCode": "{{ $json.couponCode }}"
}
```

### 2. Exemplo no cURL

```bash
curl -X POST \
  https://us-central1-[PROJECT_ID].cloudfunctions.net/createStripeCheckoutN8n \
  -H "Content-Type: application/json" \
  -d '{
    "uid": "abc123xyz",
    "couponCode": "PROMO2024"
  }'
```

## Deploy

Para fazer o deploy da nova função:

```bash
cd UroTrak/functions
firebase deploy --only functions:createStripeCheckoutN8n
```

## Plano Padrão

A função usa um plano fixo configurado internamente:

- **priceId**: `price_1T9xY3FsXW36w2CH8TEZIpN6`
- **planId**: `monthly`

## URLs de Redirecionamento

- **Success URL**: `{APP_URL}/perfil`
- **Cancel URL**: `{APP_URL}/pricing`

As URLs são definidas com base na variável de ambiente `APP_URL` (fallback: `http://localhost:3000`).

## Segurança

⚠️ **Importante**: Como esta função não requer autenticação, considere adicionar:

1. **API Key validation**: Validar um token/chave secreta no header
2. **Rate limiting**: Limitar número de chamadas por IP
3. **Validação de UID**: Verificar se o UID existe no Firebase antes de processar

### Exemplo com API Key (opcional):

```typescript
const apiKey = request.headers.authorization?.replace('Bearer ', '');
if (apiKey !== process.env.N8N_API_KEY) {
  response.status(401).json({ error: 'Unauthorized' });
  return;
}
```

## Logs

A função gera logs no Firebase Functions:

- Quando uma sessão é criada com sucesso
- Quando ocorrem erros
- Inclui o UID do usuário para rastreamento

## Fluxo Completo

1. n8n envia requisição POST com o UID do usuário
2. Função valida o UID
3. Função cria sessão de checkout no Stripe
4. Retorna URL de checkout para o n8n
5. n8n pode redirecionar o usuário ou enviar o link por email/SMS

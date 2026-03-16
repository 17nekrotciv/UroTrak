# Configuração de Cupom de Desconto - 3 Meses Grátis

Este guia explica como configurar o cupom de desconto de 3 meses grátis para novos usuários no Stripe.

## Visão Geral

O sistema implementado permite que **apenas novos usuários** (que nunca tiveram uma assinatura) possam usar um cupom promocional que oferece **3 meses grátis** (100% de desconto por 3 meses).

## Como Funciona

1. **Validação de Novo Usuário**: O sistema verifica automaticamente se o usuário já teve alguma assinatura anteriormente (tanto no Firestore quanto no Stripe)
2. **Validação do Cupom**: O cupom é validado para garantir que oferece 100% de desconto por exatamente 3 meses
3. **Aplicação Automática**: Se válido, o cupom é aplicado automaticamente na sessão de checkout do Stripe

## Criando o Cupom no Stripe Dashboard

### Passo 1: Criar o Cupom (Coupon)

1. Acesse o [Stripe Dashboard](https://dashboard.stripe.com/)
2. Vá em **Products** → **Coupons**
3. Clique em **+ Create coupon**
4. Configure o cupom com as seguintes opções:
   - **Type**: Percentage discount
   - **Percent off**: 100%
   - **Duration**: Repeating
   - **Duration in months**: 3
   - **Name**: "3 Meses Grátis para Novos Usuários" (ou nome de sua preferência)
   - **ID**: deixe o Stripe gerar automaticamente ou use um ID customizado (ex: `3_months_free`)
5. Clique em **Create coupon**

### Passo 2: Criar o Código Promocional (Promotion Code)

1. Após criar o cupom, você será direcionado para criar um código promocional
2. Ou vá em **Products** → **Promotion codes** → **+ Create promotion code**
3. Configure o código promocional:
   - **Coupon**: Selecione o cupom criado no Passo 1
   - **Code**: Digite o código que os usuários irão usar (ex: `WELCOME3M`)
   - **Active**: Marque como ativo
   - **Expiration date**: (opcional) defina uma data de expiração
   - **Max redemptions**: (opcional) limite quantas vezes o código pode ser usado
   - **First time customers**: (opcional) marque para restringir apenas a novos clientes
4. Clique em **Create promotion code**

### Exemplo de Configuração Recomendada

**Cupom:**
- Type: Percentage
- Percent off: 100%
- Duration: Repeating
- Duration in months: 3
- Name: "Boas-vindas - 3 Meses Grátis"

**Código Promocional:**
- Coupon: (o cupom criado acima)
- Code: `WELCOME3M`
- Active: ✓ Yes
- Expiration: nenhuma (ou defina uma data)
- Max redemptions: nenhuma (ou defina um limite)

## Usando o Cupom

### Frontend

Na página de pricing (`/pricing`), os usuários podem:

1. Ver uma seção destacada sobre o cupom promocional
2. Digitar o código do cupom no campo de entrada
3. O código é validado automaticamente no momento do checkout

### Validações Automáticas

O sistema valida automaticamente:

✅ **Usuário é novo** - Nunca teve assinatura no Firestore ou Stripe  
✅ **Cupom existe e está ativo** - O código promocional está cadastrado no Stripe  
✅ **Cupom está correto** - Oferece 100% de desconto por 3 meses  
✅ **Aplicação única** - Mesmo código digitado, só funciona para novos usuários

### Logs

O sistema registra todas as tentativas de uso de cupom:
- Cupom válido aplicado
- Cupom não atende aos critérios
- Cupom não encontrado
- Usuário não é novo (cupom ignorado)

Você pode verificar esses logs no Firebase Functions Console.

## Testes

### Cenário 1: Novo Usuário com Cupom Válido
1. Crie uma nova conta no sistema
2. Vá para a página de pricing
3. Digite o código `WELCOME3M` (ou o código que você criou)
4. Selecione um plano pago
5. No checkout do Stripe, você deve ver o desconto de 100% aplicado por 3 meses

### Cenário 2: Usuário Existente com Cupom
1. Use uma conta que já teve assinatura
2. Digite o código do cupom
3. O cupom será ignorado (verificar logs)

### Cenário 3: Cupom Inválido
1. Digite um código que não existe
2. O sistema continua normalmente sem desconto

## Troubleshooting

### O cupom não está sendo aplicado

1. **Verifique se o cupom foi criado corretamente no Stripe:**
   - Duration deve ser "repeating"
   - Duration in months deve ser 3
   - Percent off deve ser 100

2. **Verifique se o código promocional está ativo:**
   - Vá em Stripe Dashboard → Products → Promotion codes
   - Confirme que o status é "Active"

3. **Verifique se o usuário é realmente novo:**
   - Confira os logs do Firebase Functions
   - Verifique se há registros na coleção `subscription` para esse usuário

4. **Use Stripe Test Mode:**
   - Durante desenvolvimento, use o test mode
   - Crie um cupom de teste com o prefixo test_

### Verificando Logs

Para ver os logs de validação do cupom:

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Vá em **Functions** → **Logs**
3. Filtre por `Cupom` ou `coupon` para ver as mensagens relacionadas

## Segurança

O sistema implementa várias camadas de segurança:

1. **Validação Server-Side**: Toda validação é feita nas Cloud Functions, não no frontend
2. **Verificação de Novo Usuário**: Dupla verificação (Firestore + Stripe)
3. **Validação do Cupom**: Apenas cupons que atendem aos critérios específicos são aceitos
4. **Logs Completos**: Todas as tentativas são registradas para auditoria

## Customização

Se você quiser mudar as regras de validação, edite o arquivo:
`functions/src/modules/subscriptions/service/stripeService.ts`

Na função `createCheckoutSession`, você pode alterar:
- Duração dos meses grátis (linha com `duration_in_months === 3`)
- Percentual de desconto (linha com `percent_off === 100`)
- Critérios para usuário novo (função `checkIfNewUser`)

## Códigos Promocionais Adicionais

Você pode criar múltiplos códigos promocionais:

**Exemplo 1: Cupom Sazonal**
- Code: `NATAL2026`
- 50% de desconto por 2 meses
- Expira em 31/12/2026

**Exemplo 2: Cupom de Indicação**
- Code: `INDICATE50`
- 50% de desconto no primeiro mês
- Limitado a 100 usos

Lembre-se de ajustar a validação no código se quiser aceitar cupons com critérios diferentes do padrão (3 meses 100% off).

## Recursos Adicionais

- [Stripe Coupons Documentation](https://stripe.com/docs/billing/subscriptions/coupons)
- [Stripe Promotion Codes Documentation](https://stripe.com/docs/billing/subscriptions/discounts/codes)
- [Stripe API - Create Promotion Code](https://stripe.com/docs/api/promotion_codes/create)

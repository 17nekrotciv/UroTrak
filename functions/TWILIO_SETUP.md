# Configuração da Integração Twilio WhatsApp

## Visão Geral
A função `createSignUp` agora envia mensagens WhatsApp automaticamente usando templates aprovados da Twilio quando um novo paciente é convidado.

## Pré-requisitos

### 1. Conta Twilio
- Crie uma conta em [https://www.twilio.com](https://www.twilio.com)
- Verifique sua conta e configure o WhatsApp Business

### 2. Configurar WhatsApp no Twilio
1. Acesse o [Console da Twilio](https://console.twilio.com)
2. Navegue até **Messaging** > **Try it out** > **Send a WhatsApp message**
3. Siga as instruções para configurar seu número WhatsApp Business

### 3. Criar Template de Mensagem
1. No Console Twilio, vá para **Messaging** > **Content Templates**
2. Crie um novo template ou use um existente
3. Aguarde a aprovação do WhatsApp (pode levar até 24h)
4. Anote o **Content SID** do template aprovado

## Configuração no Firebase

### Adicionar Secrets no Firebase Functions

Execute os seguintes comandos no terminal:

```bash
# Account SID (encontrado no Dashboard da Twilio)
firebase functions:secrets:set TWILIO_ACCOUNT_SID

# Auth Token (encontrado no Dashboard da Twilio)
firebase functions:secrets:set TWILIO_AUTH_TOKEN

# Número WhatsApp da Twilio (formato: +14155238886)
firebase functions:secrets:set TWILIO_WHATSAPP_NUMBER
```

### Como encontrar suas credenciais:
1. **TWILIO_ACCOUNT_SID** e **TWILIO_AUTH_TOKEN**: 
   - Acesse [https://console.twilio.com](https://console.twilio.com)
   - Encontre na seção "Account Info"

2. **TWILIO_WHATSAPP_NUMBER**:
   - Navegue até **Messaging** > **Senders** > **WhatsApp senders**
   - Copie seu número no formato internacional (ex: +14155238886)

## Personalizar o Template

No arquivo [register.ts](src/modules/phone/register.ts), atualize os seguintes valores:

```typescript
await twilioClient.messages.create({
  from: `whatsapp:${TWILIO_WHATSAPP_NUMBER.value()}`,
  to: `whatsapp:${phone}`,
  contentSid: 'SEU_CONTENT_SID_AQUI', // ⚠️ ATUALIZE COM SEU CONTENT SID
  contentVariables: JSON.stringify({
    1: clinicId, // Ajuste as variáveis conforme seu template
    // 2: 'outra_variavel', // Adicione mais variáveis se necessário
  }),
});
```

## Exemplo de Template

Aqui está um exemplo de template que você pode criar no Twilio:

```
Olá! Você foi convidado pela clínica {{1}} para usar o UroTrack.
Complete seu cadastro através do link que enviaremos em breve.
```

Onde `{{1}}` será substituído pelo `clinicId`.

## Deploy

Após configurar todos os secrets, faça o deploy da função:

```bash
cd functions
npm run deploy
```

Ou para deploy de todas as functions:

```bash
firebase deploy --only functions
```

## Testando

Para testar a integração:

1. Use o endpoint da função com uma requisição POST:
```json
{
  "phoneNumber": "+5511999999999",
  "clinicId": "sua-clinica-id"
}
```

2. Verifique os logs:
```bash
firebase functions:log --only createSignUp
```

## Solução de Problemas

### Erro: "Template not found"
- Verifique se o `contentSid` está correto
- Certifique-se de que o template foi aprovado pelo WhatsApp

### Erro: "Invalid phone number"
- O número deve estar no formato internacional: `+5511999999999`
- Certifique-se de incluir o código do país

### Erro: "Authentication failed"
- Verifique se o `TWILIO_ACCOUNT_SID` e `TWILIO_AUTH_TOKEN` estão corretos
- Certifique-se de que os secrets foram configurados no Firebase

### Mensagem não enviada, mas sem erro
- Durante o período de sandbox, você precisa primeiro enviar uma mensagem para o número da Twilio com a palavra-chave específica
- Verifique as [instruções do sandbox](https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn)

## Custos

- Twilio cobra por mensagem enviada
- Verifique os preços em [https://www.twilio.com/whatsapp/pricing](https://www.twilio.com/whatsapp/pricing)
- Configure alertas de billing no Console Twilio

## Recursos Adicionais

- [Documentação Twilio WhatsApp](https://www.twilio.com/docs/whatsapp)
- [Content Templates API](https://www.twilio.com/docs/content/content-types-overview)
- [WhatsApp Template Guidelines](https://www.twilio.com/docs/whatsapp/tutorial/send-whatsapp-notification-messages-templates)

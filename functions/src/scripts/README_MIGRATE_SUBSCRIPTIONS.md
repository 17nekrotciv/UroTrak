# Script de Migração de Subscriptions

## Descrição
Este script cria documentos na coleção `subscription` do Firestore para todos os usuários existentes no Firebase Auth.

Cada documento criado terá:
- **ID do documento**: UID do usuário
- **Campo `assinado`**: "assinado"
- **Campo `createdAt`**: Timestamp da criação
- **Campo `uid`**: UID do usuário (duplicado para facilitar queries)

## Pré-requisitos

1. **Credenciais do Firebase**
   
   Você precisa de um arquivo de credenciais do Firebase Admin SDK. Para obter:
   
   - Acesse o [Console do Firebase](https://console.firebase.google.com/)
   - Vá em **Configurações do Projeto** > **Contas de Serviço**
   - Clique em **Gerar nova chave privada**
   - Salve o arquivo JSON baixado

2. **Variável de Ambiente**
   
   Configure a variável de ambiente `GOOGLE_APPLICATION_CREDENTIALS` apontando para o arquivo JSON:
   
   ```bash
   # No Windows PowerShell:
   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\caminho\para\serviceAccountKey.json"
   
   # No Windows CMD:
   set GOOGLE_APPLICATION_CREDENTIALS=C:\caminho\para\serviceAccountKey.json
   
   # No Linux/Mac:
   export GOOGLE_APPLICATION_CREDENTIALS="/caminho/para/serviceAccountKey.json"
   ```

## Como Executar

1. **Navegue até a pasta functions:**
   ```bash
   cd UroTrak/functions
   ```

2. **Instale as dependências (se ainda não instalou):**
   ```bash
   npm install
   ```

3. **Compile o TypeScript:**
   ```bash
   npm run build
   ```

4. **Execute o script:**
   ```bash
   node lib/scripts/migrateSubscriptions.js
   ```

## O que o script faz

✅ Busca todos os usuários cadastrados no Firebase Auth  
✅ Verifica se já existe um documento de subscription para cada usuário  
✅ Cria novos documentos apenas para usuários que ainda não têm subscription  
✅ Exibe progresso em tempo real no console  
✅ Mostra resumo final com estatísticas  

## Segurança

- ✅ **Idempotente**: Pode ser executado múltiplas vezes sem duplicar dados
- ✅ **Não sobrescreve**: Não altera documentos existentes
- ✅ **Tratamento de erros**: Continua a execução mesmo se algum usuário falhar
- ✅ **Logs detalhados**: Mostra exatamente o que está acontecendo

## Exemplo de Saída

```
🚀 Iniciando migração de subscriptions...

📄 Processando lote de 150 usuários...
✅ Subscription criado para usuário abc123 (user@example.com)
✅ Subscription criado para usuário def456 (outro@example.com)
⏭️  Subscription já existe para usuário ghi789 (existe@example.com)
...

🎉 Migração concluída!
──────────────────────────────────────────────────
Total de usuários processados: 150
Subscriptions criados: 142
Erros: 0
──────────────────────────────────────────────────
```

## Reverter Migração (se necessário)

Se precisar remover os documentos criados:

```javascript
// Execute no Console do Firebase ou crie outro script
const subscriptions = await db.collection('subscription').get();
const batch = db.batch();
subscriptions.docs.forEach(doc => batch.delete(doc.ref));
await batch.commit();
```

## Observações

- O script processa os usuários em lotes de 1000 (limitação da API do Firebase)
- Subscriptions já existentes não são modificados
- O campo `assinado` pode ser ajustado conforme sua necessidade no código

## Solução de Problemas

**Erro de credenciais:**
- Verifique se a variável `GOOGLE_APPLICATION_CREDENTIALS` está configurada corretamente
- Confirme que o arquivo JSON de credenciais existe no caminho especificado

**Erro de permissões:**
- Certifique-se de que a conta de serviço tem permissões de Admin no Firestore e Auth

**Script não encontra o arquivo:**
- Certifique-se de que rodou `npm run build` antes de executar o script

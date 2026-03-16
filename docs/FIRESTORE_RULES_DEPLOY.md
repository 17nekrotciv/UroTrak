# Como Publicar as Firestore Rules no Banco `uritrak`

## ⚠️ IMPORTANTE

O banco de dados se chama **`uritrak`** (não é o banco default). Por isso, as regras **NÃO podem ser deployadas via CLI** com `firebase deploy --only firestore:rules`.

Você **DEVE** fazer o deploy manual pelo Firebase Console.

---

## 📋 Passo a Passo

### 1. Acesse o Firebase Console

Abra este link no navegador:
```
https://console.firebase.google.com/project/urotrack-qqp6e/firestore/databases
```

### 2. Selecione o Banco de Dados `uritrak`

Na parte superior da tela, você verá um **dropdown** com o nome do banco de dados atual.

**IMPORTANTE:** Certifique-se de que está selecionado **`uritrak`** e NÃO `(default)`.

### 3. Vá para a Aba "Rules" (Regras)

Clique na aba **"Rules"** ou **"Regras"** (dependendo do idioma do console).

### 4. Verifique as Regras Atuais

Se você ver algo como:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Isso significa que **NENHUMA regra foi publicada ainda** e todos os acessos estão bloqueados.

### 5. Cole as Regras Corretas

**Apague tudo** e cole este código:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    
    // Health check - qualquer pessoa pode ler
    match /health_checks/status {
      allow read: if true;
    }

    // Usuários - cada usuário pode ler/escrever seus próprios dados
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Assinaturas - usuários podem ler sua própria assinatura
    // Apenas Cloud Functions (Admin SDK) podem escrever
    match /subscriptions/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }
  }
}
```

### 6. Clique em "Publicar" ou "Publish"

Um botão azul/roxo no canto superior direito.

### 7. Aguarde a Confirmação

Você verá uma mensagem dizendo que as regras foram publicadas com sucesso.

---

## ✅ Como Verificar se Funcionou

1. **Recarregue a página** do seu app
2. **Abra o Console do navegador** (F12)
3. **NÃO deve aparecer** o erro: `FirebaseError: Missing or insufficient permissions`

Se o erro continuar:
- Verifique se você está no banco correto (`uritrak`)
- Faça logout e login novamente no app
- Tente em uma aba anônima/privada

---

## 🐛 Verificação Rápida

Execute este código no Console do navegador (F12 → Console):

```javascript
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { auth } from '@/lib/firebase';

const user = auth.currentUser;
if (user) {
  const docRef = doc(db, 'subscriptions', user.uid);
  getDoc(docRef).then(snap => {
    console.log('✅ Regras OK! Documento:', snap.exists() ? snap.data() : 'não existe');
  }).catch(err => {
    console.error('❌ Erro:', err.message);
  });
} else {
  console.log('⚠️ Usuário não autenticado');
}
```

Se aparecer `✅ Regras OK!`, as regras estão funcionando!

---

## 📝 Regras Explicadas

### `health_checks/status`
- Permite leitura pública para testes de conexão

### `users/{userId}/{document=**}`
- Cada usuário pode ler/escrever **apenas seus próprios dados**
- `{document=**}` permite acesso a subcoleções

### `subscriptions/{userId}`
- Cada usuário pode **ler apenas sua própria assinatura**
- **Ninguém** pode escrever diretamente (apenas Cloud Functions via Admin SDK)
- `if false` bloqueia todas as escritas do cliente

---

## ⚠️ Importante

Após publicar as regras, pode levar **até 1 minuto** para as mudanças se propagarem globalmente.

Se o erro persistir após 1 minuto:
1. Limpe o cache do navegador
2. Faça logout e login novamente
3. Tente em outra aba/janela

---

## 🔍 Logs Úteis

Para verificar se algum acesso está sendo bloqueado:

1. Firebase Console → Firestore → **Monitoring**
2. Procure por **"Permission denied"** nos logs
3. Isso mostra quais regras estão bloqueando acessos

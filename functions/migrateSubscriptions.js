/**
 * Script de migração para criar documentos de subscription para todos os usuários
 * 
 * Este script:
 * 1. Busca todos os usuários do Firebase Auth
 * 2. Cria documentos na coleção 'subscription' usando o UID como ID do documento
 * 3. Adiciona o campo 'assinado' com valor 'assinado'
 * 
 * Como executar:
 * 1. Configure a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS
 * 2. node migrateSubscriptions.js
 */

const admin = require('firebase-admin');
const dotenv = require('dotenv');

// Carregar variáveis de ambiente
dotenv.config();

// Inicializar Firebase Admin (se ainda não estiver inicializado)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
// Configurar o database para 'uritrak'
db.settings({ databaseId: 'uritrak' });
const auth = admin.auth();

async function migrateSubscriptions() {
  console.log('🚀 Iniciando migração de subscriptions...\n');

  try {
    let totalUsers = 0;
    let totalCreated = 0;
    let totalErrors = 0;
    let nextPageToken = undefined;

    // Listar todos os usuários (em lotes de 1000)
    do {
      const listUsersResult = await auth.listUsers(1000, nextPageToken);
      
      console.log(`📄 Processando lote de ${listUsersResult.users.length} usuários...`);

      // Processar cada usuário
      for (const userRecord of listUsersResult.users) {
        totalUsers++;
        
        try {
          const uid = userRecord.uid;
          const subscriptionRef = db.collection('subscription').doc(uid);

          // Verificar se já existe
          const existingDoc = await subscriptionRef.get();
          
          if (existingDoc.exists) {
            console.log(`⏭️  Subscription já existe para usuário ${uid} (${userRecord.email || 'sem email'})`);
            continue;
          }

          // Criar documento de subscription
          const subscriptionData = {
            assinado: 'assinado',
            createdAt: admin.firestore.Timestamp.now(),
            uid: uid,
          };

          await subscriptionRef.set(subscriptionData);
          totalCreated++;
          
          console.log(`✅ Subscription criado para usuário ${uid} (${userRecord.email || 'sem email'})`);
          
        } catch (error) {
          totalErrors++;
          console.error(`❌ Erro ao processar usuário ${userRecord.uid}:`, error);
        }
      }

      nextPageToken = listUsersResult.pageToken;

    } while (nextPageToken);

    // Resumo final
    console.log('\n🎉 Migração concluída!');
    console.log('─'.repeat(50));
    console.log(`Total de usuários processados: ${totalUsers}`);
    console.log(`Subscriptions criados: ${totalCreated}`);
    console.log(`Erros: ${totalErrors}`);
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('💥 Erro fatal durante a migração:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Executar migração
migrateSubscriptions();

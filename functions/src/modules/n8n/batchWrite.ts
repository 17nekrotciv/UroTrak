// Em functions/src/index.ts
import { onRequest } from 'firebase-functions/v2/https'; // <-- MUDANÇA: Importação V2
import * as admin from 'firebase-admin';
import cors from 'cors';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

// Inicializa o Firebase Admin (necessário para a função ter acesso ao db)
const db = getFirestore('uritrak');

// Habilita o CORS para aceitar requisições do n8n
const corsHandler = cors({ origin: true });

/**
 * Interface para os dados que esperamos receber do n8n.
 * Isso nos dá type-safety.
 */
interface N8nWebhookPayload {
  userId: string;
  logs: {
    urinaryLogs?: any[]; // Usamos 'any' para flexibilidade na entrada
    erectileLogs?: any[];
    psaLogs?: any[];
  };
}

/**
 * Esta é a Cloud Function HTTP (V2) que o n8n irá chamar.
 */
export const addLogsFromN8n = onRequest(
  // <-- MUDANÇA: Função V2
  {
    secrets: ['N8N_SECRET_KEY'], // <-- MUDANÇA: Injeta o secret
    region: 'us-central1', // Opcional: Especifique a região (recomendado)
  },
  async (request, response) => {
    // 1. Lidar com a requisição CORS
    corsHandler(request, response, async () => {
      // 2. Verificar se o método é POST
      if (request.method !== 'POST') {
        response.status(405).send('Method Not Allowed');
        return;
      }

      // 3. (SEGURANÇA) Verificar a Chave Secreta
      // O secret injetado (acima) agora está disponível no process.env
      const expectedSecret = process.env.N8N_SECRET_KEY;

      if (!expectedSecret) {
        console.error(
          'A variável de ambiente N8N_SECRET_KEY não está definida!'
        );
        response.status(500).send('Erro de configuração no servidor.');
        return;
      }

      const authHeader = request.headers.authorization;
      logger.info('Verificando Autorização', {
        receivedAuth: authHeader,
        expectedFull: `Bearer ${expectedSecret}`,
      });
      // Verificamos se o n8n enviou "Bearer [SUA_CHAVE_SECRETA]"
      if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
        logger.warn('Tentativa de acesso não autorizada.', {
          receivedHeader: authHeader,
          expectedPrefix: 'Bearer',
          expectedSecretExists: !!expectedSecret, // true/false
        });
        response.status(401).send('Unauthorized');
        return;
      }

      // 4. (LÓGICA) Obter e validar os dados do corpo (body)
      const { userId, logs } = request.body as N8nWebhookPayload;

      if (!userId || !logs) {
        response
          .status(400)
          .send("Bad Request: 'userId' e 'logs' são obrigatórios.");
        return;
      }

      // 5. Preparar o Batch de Escrita no Firestore
      // Um 'batch' garante que todos os logs sejam salvos de uma vez.
      // Se um falhar, nenhum é salvo (é uma transação).
      const batch = db.batch();
      let logsAddedCount = 0;

      /**
       * Função auxiliar para processar um log e adicioná-lo ao batch.
       * Ela converte a data ISO (string) para Timestamp (Firestore).
       */
      const processAndAddLog = (collectionName: string, log: any) => {
        // Validação básica do log
        if (!log || typeof log.date !== 'string') {
          console.warn(
            `Log pulado em ${collectionName} para o usuário ${userId}: data inválida.`
          );
          return;
        }

        const dateOnlyString = log.date.split('T')[0];

        const parts = dateOnlyString.split('-');
        if (parts.length !== 3) {
        }

        // 3. Converte para números (lembrando que mês em JS é 0-indexado)
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Mês do JS (0 = Jan, 10 = Nov)
        const day = parseInt(parts[2], 10);

        // 4. Cria o novo Date, setando para MEIO-DIA (12:00) na hora LOCAL do servidor.
        // Usar meio-dia (e não meia-noite) é a prática mais segura para
        // evitar problemas com troca de fuso (Horário de Verão / DST).
        //
        // Isso cria um timestamp que, em QUALQUER fuso do mundo,
        // ainda será "dia 12".
        const processedDate = new Date(year, month, day, 12, 0, 0);

        // Copia o log e converte a data
        const processedLog = {
          ...log,
          // Esta é a conversão CRÍTICA.
          // O n8n/IA envia string ISO, o app espera um Timestamp do Firestore.
          date: admin.firestore.Timestamp.fromDate(processedDate),
        };

        // Cria uma referência para um NOVO documento na subcoleção correta
        // O caminho "urotrak" vem do seu lib/firebase.ts e data-provider.tsx
        const docRef = db
          .collection('urotrak')
          .doc(userId)
          .collection(collectionName) // ex: "urinary_logs"
          .doc(); // .doc() cria um ID automático

        // Adiciona a operação de escrita ao batch
        batch.set(docRef, processedLog);
        logsAddedCount++;
      };

      try {
        // 6. Processar cada array de logs
        (logs.urinaryLogs || []).forEach((log) =>
          processAndAddLog('urinary_logs', log)
        );
        (logs.erectileLogs || []).forEach((log) =>
          processAndAddLog('erectile_logs', log)
        );
        (logs.psaLogs || []).forEach((log) =>
          processAndAddLog('psa_logs', log)
        );

        if (logsAddedCount === 0) {
          response.status(400).send({
            status: 'no_logs',
            message: 'Nenhum log válido foi fornecido.',
          });
          return;
        }

        // 7. Executar (commitar) o batch
        await batch.commit();

        // 8. Enviar resposta de sucesso de volta ao n8n
        response.status(200).send({
          status: 'success',
          message: `${logsAddedCount} logs adicionados com sucesso para o usuário ${userId}.`,
        });
      } catch (error: any) {
        console.error(`Erro ao salvar logs para o usuário ${userId}:`, error);
        response.status(500).send(`Erro interno do servidor: ${error.message}`);
      }
    }); // Fim do corsHandler
  }
);

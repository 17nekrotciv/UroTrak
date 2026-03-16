import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

// Inicializa o Admin SDK se ainda não foi inicializado
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = getFirestore('uritrak');
const corsHandler = cors({ origin: true });

/**
 * Interface para os dados que esperamos receber do n8n.
 */
interface N8nWebhookPayload {
  userId: string;
  logs: {
    urinaryLogs?: any[];
    erectileLogs?: any[];
    psaLogs?: any[];
  };
}

/**
 * Cloud Function HTTP (V2) para processar logs vindos do n8n.
 */
export const addLogsFromN8n = onRequest(
  {
    secrets: ['N8N_SECRET_KEY'],
    region: 'us-central1',
  },
  async (request, response) => {
    // 1. Lidar com a requisição CORS
    corsHandler(request, response, async () => {
      
      // 2. Verificar se o método é POST
      if (request.method !== 'POST') {
        response.status(405).send({ error: 'Method Not Allowed' });
        return;
      }

      // 3. Segurança: Verificar a Chave Secreta no Header
      const expectedSecret = process.env.N8N_SECRET_KEY;
      const authHeader = request.headers.authorization;

      if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
        logger.warn('Tentativa de acesso não autorizada.', { receivedHeader: authHeader });
        response.status(401).send({ error: 'Unauthorized' });
        return;
      }

      // 4. Obter e validar os dados do corpo (body)
      const { userId, logs } = request.body as N8nWebhookPayload;

      if (!userId || !logs) {
        response.status(400).send({ error: "Bad Request: 'userId' e 'logs' são obrigatórios." });
        return;
      }

      // 5. Preparar o Batch e o objeto de resposta detalhado
      const batch = db.batch();
      let logsAddedCount = 0;

      // Estrutura para retornar exatamente o que foi salvo para o n8n
      const processedResults: { [key: string]: any[] } = {
        urinary_logs: [],
        erectile_logs: [],
        psa_logs: []
      };

      /**
       * Função auxiliar para processar um log, converter data e adicionar ao batch.
       */
      const processAndAddLog = (collectionName: string, log: any) => {
        if (!log || typeof log.date !== 'string') {
          logger.warn(`Log ignorado em ${collectionName}: data inválida.`);
          return;
        }

        // Conversão de data para Meio-Dia (evitar problemas de fuso horário/DST)
        const dateOnlyString = log.date.split('T')[0];
        const parts = dateOnlyString.split('-');
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const processedDate = new Date(year, month, day, 12, 0, 0);

        // Referência do documento com ID gerado automaticamente
        const docRef = db
          .collection('urotrak')
          .doc(userId)
          .collection(collectionName)
          .doc();

        const logData = {
          ...log,
          date: admin.firestore.Timestamp.fromDate(processedDate),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Adiciona ao Batch
        batch.set(docRef, logData);

        // Adiciona ao log de resposta para o n8n (facilitando o debug/tracking)
        processedResults[collectionName].push({
          id: docRef.id,
          ...log,
          processedDateISO: processedDate.toISOString()
        });

        logsAddedCount++;
      };

      try {
        // 6. Processar categorias
        (logs.urinaryLogs || []).forEach((log) => processAndAddLog('urinary_logs', log));
        (logs.erectileLogs || []).forEach((log) => processAndAddLog('erectile_logs', log));
        (logs.psaLogs || []).forEach((log) => processAndAddLog('psa_logs', log));

        if (logsAddedCount === 0) {
          response.status(400).send({
            status: 'error',
            message: 'Nenhum log válido foi processado.',
          });
          return;
        }

        // 7. Commit no Firestore
        await batch.commit();

        // 8. Resposta estruturada para o HTTP Request Node do n8n 🚀
        response.status(200).send({
          status: 'success',
          userId: userId,
          summary: {
            totalInserted: logsAddedCount,
            urinary: processedResults.urinary_logs.length,
            erectile: processedResults.erectile_logs.length,
            psa: processedResults.psa_logs.length
          },
          insertedLogs: processedResults
        });

      } catch (error: any) {
        logger.error(`Erro ao salvar logs para o usuário ${userId}:`, error);
        response.status(500).send({
          status: 'error',
          message: error.message
        });
      }
    });
  }
);
/**
 * Recebe um número de telefone e um clinicId e cria um documento no Firestore
 * na coleção 'signupStatus', usando o número de telefone como ID do documento.
 *
 * @param {object} req O objeto de requisição HTTP (Request). Espera-se { data: { phoneNumber: "...", clinicId: "..." } }
 * @param {object} res O objeto de resposta HTTP (Response).
 */

import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';

const db = getFirestore('uritrak');

// Exporta a função HTTP
export const createSignUp = onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  // Preflight request
  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }
  // 1. Verificação do Método HTTP
  if (request.method !== 'POST') {
    response.status(405).send('Método não permitido. Use POST.');
    return;
  }

  // 2. Extração e Validação dos Dados
  const phone = request.body.phoneNumber;
  const phoneNumber = phone.substring(1);

  // ⭐️ CAMPO NOVO: Extração do clinicId
  const clinicId = request.body.clinicId;

  // ⚠️ VALIDAÇÃO ATUALIZADA para ambos os campos
  if (
    !phoneNumber ||
    typeof phoneNumber !== 'string' ||
    !clinicId ||
    typeof clinicId !== 'string'
  ) {
    response.status(400).send({
      error:
        'Os campos "phoneNumber" e "clinicId" são obrigatórios e devem ser strings.',
    });
    return;
  }

  const collectionName = 'signupStatus';
  const docId = phoneNumber;

  // 🌟 DADOS ATUALIZADOS: clinicId adicionado
  const newDocData = {
    clinicId: clinicId, // <-- AGORA INCLUÍDO
  };

  try {
    await db.collection(collectionName).doc(docId).set(newDocData);

    // 4. Resposta de Sucesso
    console.log(
      `Documento criado com sucesso. Coleção: ${collectionName}, ID: ${docId}, Clinic ID: ${clinicId}`
    );
    response.status(200).send({
      message: 'Status de cadastro criado com sucesso!',
      docId: docId,
    });
    return;
  } catch (error) {
    // 5. Resposta de Erro
    console.error('Erro ao criar o documento:', error);
    response.status(500).send({
      error: 'Falha interna ao processar a requisição.',
    });
    return;
  }
});

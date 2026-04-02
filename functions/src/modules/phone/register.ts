/**
 * Recebe um número de telefone, clinicId e nome, cria um documento no Firestore
 * na coleção 'signupStatus' e envia uma mensagem WhatsApp via Twilio.
 *
 * @param {object} req O objeto de requisição HTTP (Request). Espera-se { data: { phoneNumber: "...", clinicId: "..."} }
 * @param {object} res O objeto de resposta HTTP (Response).
 */

import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import twilio from 'twilio';

const db = getFirestore('uritrak');

// Definir os segredos da Twilio
const TWILIO_ACCOUNT_SID = defineSecret('TWILIO_ACCOUNT_SID');
const TWILIO_AUTH_TOKEN = defineSecret('TWILIO_AUTH_TOKEN');
const TWILIO_WHATSAPP_NUMBER = defineSecret('TWILIO_WHATSAPP_NUMBER');

// Exporta a função HTTP
export const createSignUp = onRequest(
  { secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER] },
  async (request, response) => {
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


    // ⚠️ VALIDAÇÃO ATUALIZADA para todos os campos
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

      // 4. Enviar mensagem WhatsApp via Twilio
      try {
        const twilioClient = twilio(
          TWILIO_ACCOUNT_SID.value(),
          TWILIO_AUTH_TOKEN.value()
        );

        // Envia um template de mensagem aprovado pela Twilio
        await twilioClient.messages.create({
          from: `whatsapp:${TWILIO_WHATSAPP_NUMBER.value()}`, // Número do WhatsApp da Twilio
          to: `whatsapp:${phone}`, // Número do paciente (formato: +5511999999999)
          contentSid: 'HX5c44415afa66489d8e7b0757b6259176', // ID do template aprovado pela Twilio
          contentVariables: JSON.stringify({
            1: "seja bem-vindo(a)", // Nome do paciente
          }),
        });

        console.log(
          `Mensagem WhatsApp enviada com sucesso para ${phone} via Twilio.`
        );
      } catch (twilioError) {
        console.error('Erro ao enviar mensagem WhatsApp via Twilio:', twilioError);
        // Continua mesmo se o WhatsApp falhar
      }

      // 5. Resposta de Sucesso
      console.log(
        `Documento criado com sucesso. Coleção: ${collectionName}, ID: ${docId}, Clinic ID: ${clinicId}`
      );
      response.status(200).send({
        message: 'Status de cadastro criado com sucesso!',
        docId: docId,
      });
      return;
    } catch (error) {
      // 6. Resposta de Erro
      console.error('Erro ao criar o documento:', error);
      response.status(500).send({
        error: 'Falha interna ao processar a requisição.',
      });
      return;
    }
  });

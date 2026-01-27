// Em functions/src/index.ts (Continuação)

// Importações (garantir que todas as dependências estejam no topo do arquivo)
import { onRequest } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import cors from 'cors';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import sgMail from '@sendgrid/mail'; // Adicione este import, se ainda não estiver lá
import { defineSecret } from 'firebase-functions/params'; // Adicione este import

// ... (db initialization and corsHandler definition should be up here) ...

const db = getFirestore('uritrak');

const SENDGRID_API_KEY = defineSecret('SENDGRID_API_KEY');

const corsHandler = cors({ origin: true });

const SIGNUP_COLLECTION = 'signupStatus';
const USERS_COLLECTION = 'users';

interface SignupData {
  clinicId: string;
  cpf: string | number;
  email: string;
  nome: string;
}

const sendTemporaryPasswordEmail = async (
  toEmail: string,
  password: string,
  senderName: string
) => {
  // Configura a chave API do SendGrid usando o segredo

  sgMail.setApiKey(SENDGRID_API_KEY.value());

  const msg = {
    to: toEmail,
    from: {
      email: 'urotrack@clinicauroonco.com.br',
      name: 'UroTrack - Clínica Uro Onco',
    },
    subject: 'Sua Conta UroTrack Foi Criada - Senha Provisória',
    html: `
        <div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
            <p>Olá ${senderName},</p>
            <p>Sua conta na plataforma UroTrack foi criada com sucesso!</p>
            <p><strong>Seu e-mail de acesso é:</strong> ${toEmail}</p>
            <p><strong>Sua senha provisória é:</strong> <strong>${password}</strong></p>
            <p>Recomendamos que você altere sua senha imediatamente após o primeiro login para sua segurança.</p>
            <p style="margin-top: 20px;">Atenciosamente,<br>A equipe UroTrack</p>
        </div>
    `,
  };

  await sgMail.send(msg);
  logger.info(`Email com senha provisória enviado para: ${toEmail}`);
};

/**
 * Cria um novo usuário (Auth e Firestore) buscando os dados do documento
 * de staging na coleção 'userSignUp' com base no número de telefone.
 * * Este é o endpoint HTTP seguro que o n8n irá chamar.
 */
export const createUserFromN8n = onRequest(
  // Configurações do Firebase V2 para a função
  {
    secrets: ['N8N_SECRET_KEY', 'SENDGRID_API_KEY'],
    region: 'us-central1',
  },
  async (request, response) => {
    // 1. Lidar com a requisição CORS
    corsHandler(request, response, async () => {
      // 2. Verificar o Método HTTP
      if (request.method !== 'POST') {
        response.status(405).send('Method Not Allowed');
        return;
      }

      // 3. (SEGURANÇA) Verificar a Chave Secreta (Copiado da sua função que funciona)
      const expectedSecret = process.env.N8N_SECRET_KEY;

      if (!expectedSecret) {
        logger.error(
          'A variável de ambiente N8N_SECRET_KEY não está definida!'
        );
        response.status(500).send('Erro de configuração no servidor.');
        return;
      }

      const authHeader = request.headers.authorization;
      if (!authHeader || authHeader !== `Bearer ${expectedSecret}`) {
        response.status(401).send('Unauthorized');
        return;
      }

      // 4. Obter e validar o número de telefone do BODY
      // No protocolo HTTP, o n8n enviará o JSON diretamente.
      // Se o n8n enviava: { "data": { "phoneNumber": "..." } } antes,
      // no HTTP ele pode enviar apenas: { "phoneNumber": "..." }
      const phoneNumber = request.body.phoneNumber;

      if (!phoneNumber || typeof phoneNumber !== 'string') {
        response.status(400).send("Bad Request: 'phoneNumber' é obrigatório.");
        return;
      }

      // 5. Busca os Dados na Coleção de Staging (Lógica copiada da função anterior)
      const signupDocRef = db.collection(SIGNUP_COLLECTION).doc(phoneNumber);
      const signupDoc = await signupDocRef.get();

      if (!signupDoc.exists) {
        logger.error(
          `Documento de cadastro não encontrado para o telefone: ${phoneNumber}`
        );
        response.status(404).send({
          status: 'error',
          message:
            'Cadastro inicial não encontrado. Verifique o número de telefone.',
        });
        return;
      }

      const data = signupDoc.data() as SignupData;

      const cpfStr = String(data.cpf);
      const formattedPhoneStr = phoneNumber;

      if (!data.email || !data.nome || !data.clinicId) {
        logger.error('Dados de cadastro incompletos', { data });
        response.status(400).send({
          status: 'error',
          message: 'Dados essenciais estão faltando no registro de cadastro.',
        });
        return;
      }

      const generateTemporaryPassword = (length = 10): string => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < length; i++) {
          password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
      };

      const temporaryPassword = generateTemporaryPassword();
      logger.info('Senha provisória gerada.');

      // 6. Criação do Usuário no Firebase Authentication
      let uid: string;

      try {
        const userRecord = await admin.auth().createUser({
          email: data.email,
          displayName: data.nome,
          password: temporaryPassword,
        });

        uid = userRecord.uid;
        logger.info(`Usuário criado no Auth com UID: ${uid}`);
      } catch (error: any) {
        logger.error('Erro ao criar usuário no Auth:', error);
        // Resposta de erro para o cliente
        response.status(409).send({
          // Usando 409 Conflict para e-mail/telefone já em uso
          status: 'error',
          message: `Falha na Autenticação: ${error.message}`,
          errorCode: error.code || 'internal',
        });
        return;
      }

      // 7. Criação do Documento no Firestore e Atualização do Staging
      try {
        const userDocRef = db.collection(USERS_COLLECTION).doc(uid);

        const userData = {
          uid: uid,
          email: data.email,
          displayName: data.nome,
          clinicId: data.clinicId,
          phone: formattedPhoneStr,
          cpf: cpfStr,
          role: 'user',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await userDocRef.set(userData);

        // Atualiza o documento de staging
        // await signupDocRef.update({
        //   status: 'migrated_to_user',
        //   uid: uid,
        //   migrationCompletedAt: admin.firestore.FieldValue.serverTimestamp(),
        // });

        try {
          // ✅ Chamada à nova função de envio de email
          await sendTemporaryPasswordEmail(
            data.email,
            temporaryPassword,
            data.nome
          );
        } catch (emailError) {
          logger.error(
            'Falha ao enviar e-mail com senha provisória:',
            emailError
          );
          // A falha no envio do email é logada, mas o cadastro do usuário é mantido como sucesso.
        }

        // 8. Resposta de Sucesso
        response.status(200).send({
          status: 'success',
          message: 'Usuário criado e registrado com sucesso!',
          uid: uid,
          email: data.email,
        });
      } catch (error: any) {
        logger.error(
          'Erro ao salvar no Firestore ou atualizar staging:',
          error
        );

        response.status(500).send({
          status: 'error',
          message: `Falha ao finalizar o cadastro: ${error.message}`,
        });
      }
    }); // Fim do corsHandler
  }
);

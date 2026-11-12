const { cert, getApps, initializeApp } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const DispositivoNotificacao = require('../models/dispositivoNotificacao');

function getMessagingClient() {
  const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawServiceAccount) return null;

  try {
    const serviceAccount = JSON.parse(rawServiceAccount);
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      return null;
    }
    const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount) });
    return getMessaging(app);
  } catch (_) {
    return null;
  }
}

async function enviarPush({ dispositivos, titulo, mensagem }) {
  const messaging = getMessagingClient();
  if (!messaging || !dispositivos.length) return;

  try {
    const destinos = dispositivos.slice(0, 500);
    const response = await messaging.sendEach(
      destinos.map((dispositivo) => ({
        notification: { title: titulo, body: mensagem },
        fid: dispositivo.instalacao_id,
      })),
    );
    const instalacoesInvalidas = response.responses
      .map((resultado, index) => ({ resultado, dispositivo: destinos[index] }))
      .filter(({ resultado }) => !resultado.success && (
        resultado.error?.code === 'messaging/registration-token-not-registered' ||
        resultado.error?.code === 'messaging/invalid-registration-token'
      ))
      .map(({ dispositivo }) => dispositivo.instalacao_id);

    if (instalacoesInvalidas.length) {
      await DispositivoNotificacao.deleteMany({ instalacao_id: { $in: instalacoesInvalidas } });
    }
  } catch (_) {
    // Push é complementar: falhas no provedor não desfazem a operação do SGB.
  }
}

module.exports = { enviarPush };

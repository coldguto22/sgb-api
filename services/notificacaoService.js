const DispositivoNotificacao = require('../models/dispositivoNotificacao');
const Notificacao = require('../models/notificacao');
const { enviarPush } = require('./firebaseMessaging');

async function criarNotificacao({ idUsuario, titulo, mensagem, tipo }) {
  try {
    const notificacao = await Notificacao.create({
      id_usuario: idUsuario,
      titulo,
      mensagem,
      tipo,
    });
    const dispositivos = await DispositivoNotificacao.find({ id_usuario: idUsuario })
      .select('instalacao_id');
    await enviarPush({ dispositivos, titulo, mensagem });
    return notificacao;
  } catch (_) {
    // A persistência/envio da notificação não pode reverter uma operação já concluída.
    return null;
  }
}

module.exports = { criarNotificacao };

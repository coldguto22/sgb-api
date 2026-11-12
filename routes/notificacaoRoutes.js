const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Notificacao = require('../models/notificacao');
const DispositivoNotificacao = require('../models/dispositivoNotificacao');
const { autenticarUsuario } = require('../middleware/auth');

router.put('/dispositivos', autenticarUsuario, async (req, res) => {
  const instalacaoId = req.body?.instalacao_id?.trim();
  const plataforma = req.body?.plataforma;
  if (
    typeof instalacaoId !== 'string' ||
    instalacaoId.length < 10 ||
    instalacaoId.length > 2048 ||
    !['android', 'ios'].includes(plataforma)
  ) {
    return res.status(400).json({ message: 'Dispositivo inválido.' });
  }

  try {
    await DispositivoNotificacao.findOneAndUpdate(
      { instalacao_id: instalacaoId },
      {
        $set: {
          id_usuario: req.auth.userId,
          plataforma,
          ultimo_acesso_em: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    return res.status(204).send();
  } catch (_) {
    return res.status(500).json({ message: 'Não foi possível registrar o dispositivo.' });
  }
});

router.delete('/dispositivos', autenticarUsuario, async (req, res) => {
  const instalacaoId = req.body?.instalacao_id?.trim();
  if (typeof instalacaoId !== 'string' || instalacaoId.length < 10 || instalacaoId.length > 2048) {
    return res.status(400).json({ message: 'Dispositivo inválido.' });
  }
  try {
    await DispositivoNotificacao.findOneAndDelete({
      id_usuario: req.auth.userId,
      instalacao_id: instalacaoId,
    });
    return res.status(204).send();
  } catch (_) {
    return res.status(500).json({ message: 'Não foi possível remover o dispositivo.' });
  }
});

router.get('/minhas', autenticarUsuario, async (req, res) => {
  try {
    const itens = await Notificacao.find({ id_usuario: req.auth.userId }).sort({ createdAt: -1 }).limit(50);
    res.json(itens.map((item) => ({ _id: item._id, titulo: item.titulo, mensagem: item.mensagem, tipo: item.tipo, lida_em: item.lida_em, createdAt: item.createdAt })));
  } catch (_) { res.status(500).json({ message: 'Não foi possível consultar notificações.' }); }
});
router.put('/:id/lida', autenticarUsuario, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Notificação inválida.' });
  const item = await Notificacao.findOneAndUpdate({ _id: req.params.id, id_usuario: req.auth.userId }, { $set: { lida_em: new Date() } }, { new: true });
  if (!item) return res.status(404).json({ message: 'Notificação não encontrada.' });
  res.json({ _id: item._id, lida_em: item.lida_em });
});
module.exports = router;

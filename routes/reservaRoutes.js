const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Reserva = require('../models/reserva');
const Livro = require('../models/livro');
const { autenticarUsuario } = require('../middleware/auth');
const { criarNotificacao } = require('../services/notificacaoService');

router.get('/minhas', autenticarUsuario, async (req, res) => {
  try {
    await liberarReservasExpiradas();
    const reservas = await Reserva.find({ id_usuario: req.auth.userId })
      .populate('id_livro', 'titulo isbn');
    res.json(reservas.map(resumo));
  } catch (_) {
    res.status(500).json({ message: 'Não foi possível consultar reservas.' });
  }
});

router.post('/', autenticarUsuario, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.body.id_livro)) {
    return res.status(400).json({ message: 'Livro inválido.' });
  }
  try {
    await liberarReservasExpiradas();
    const dataLimiteRetirada = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const livro = await Livro.findOneAndUpdate(
      { _id: req.body.id_livro, quantidade_disponivel: { $gt: 0 } },
      { $inc: { quantidade_disponivel: -1 } },
      { new: true },
    );

    if (!livro) return criarReservaFila(req, res);

    let reserva;
    try {
      reserva = await Reserva.create({
        id_usuario: req.auth.userId,
        id_livro: livro._id,
        tipo: 'Retirada',
        data_limite_retirada: dataLimiteRetirada,
      });
    } catch (error) {
      await Livro.findByIdAndUpdate(livro._id, { $inc: { quantidade_disponivel: 1 } });
      throw error;
    }

    await criarNotificacao({
      idUsuario: req.auth.userId,
      titulo: 'Reserva para retirada registrada',
      mensagem: `"${livro.titulo}" está separado para você retirar em até dois dias.`,
      tipo: 'Reserva',
    });
    return res.status(201).json(resumo({ ...reserva.toObject(), id_livro: livro }));
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ message: 'Já existe uma reserva ativa para este livro.' });
    }
    return res.status(400).json({ message: 'Não foi possível criar a reserva.' });
  }
});

async function criarReservaFila(req, res) {
  const livro = await Livro.findById(req.body.id_livro);
  if (!livro) return res.status(404).json({ message: 'Livro não encontrado.' });
  const reserva = await Reserva.create({
    id_usuario: req.auth.userId,
    id_livro: livro._id,
    tipo: 'Fila',
  });
  await criarNotificacao({
    idUsuario: req.auth.userId,
    titulo: 'Reserva em fila registrada',
    mensagem: `Você entrou na fila de reserva de "${livro.titulo}".`,
    tipo: 'Reserva',
  });
  return res.status(201).json(resumo({ ...reserva.toObject(), id_livro: livro }));
}

router.delete('/:id', autenticarUsuario, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Reserva inválida.' });
  }
  const reserva = await Reserva.findOneAndUpdate(
    { _id: req.params.id, id_usuario: req.auth.userId, status: 'Ativa' },
    { $set: { status: 'Cancelada' } },
    { new: true },
  );
  if (!reserva) return res.status(404).json({ message: 'Reserva ativa não encontrada.' });
  if (reserva.tipo === 'Retirada') {
    await Livro.findByIdAndUpdate(reserva.id_livro, { $inc: { quantidade_disponivel: 1 } });
  }
  return res.status(204).send();
});

async function liberarReservasExpiradas() {
  const expiradas = await Reserva.find({
    tipo: 'Retirada',
    status: 'Ativa',
    data_limite_retirada: { $lte: new Date() },
  }).select('_id id_livro');
  for (const reserva of expiradas) {
    const atualizada = await Reserva.findOneAndUpdate(
      { _id: reserva._id, status: 'Ativa' },
      { $set: { status: 'Expirada' } },
      { new: true },
    );
    if (atualizada) {
      await Livro.findByIdAndUpdate(reserva.id_livro, { $inc: { quantidade_disponivel: 1 } });
    }
  }
}

function resumo(reserva) {
  const livro = reserva.id_livro || {};
  return {
    _id: reserva._id,
    tipo: reserva.tipo || 'Fila',
    status: reserva.status,
    createdAt: reserva.createdAt,
    data_limite_retirada: reserva.data_limite_retirada || null,
    livro: { _id: livro._id, titulo: livro.titulo, isbn: livro.isbn },
  };
}

module.exports = router;

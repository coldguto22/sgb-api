const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Reserva = require('../models/reserva');
const Livro = require('../models/livro');
const { autenticarUsuario } = require('../middleware/auth');

router.get('/minhas', autenticarUsuario, async (req, res) => {
  try {
    const reservas = await Reserva.find({ id_usuario: req.auth.userId }).populate('id_livro', 'titulo isbn');
    res.json(reservas.map(resumo));
  } catch (_) { res.status(500).json({ message: 'Não foi possível consultar reservas.' }); }
});

router.post('/', autenticarUsuario, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.body.id_livro)) return res.status(400).json({ message: 'Livro inválido.' });
  try {
    const livro = await Livro.findById(req.body.id_livro);
    if (!livro) return res.status(404).json({ message: 'Livro não encontrado.' });
    if (livro.quantidade_disponivel > 0) return res.status(400).json({ message: 'O livro está disponível; não é necessário reservar.' });
    const reserva = await Reserva.create({ id_usuario: req.auth.userId, id_livro: livro._id });
    res.status(201).json(resumo({ ...reserva.toObject(), id_livro: livro }));
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ message: 'Já existe uma reserva ativa para este livro.' });
    res.status(400).json({ message: 'Não foi possível criar a reserva.' });
  }
});

router.delete('/:id', autenticarUsuario, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Reserva inválida.' });
  const reserva = await Reserva.findOneAndUpdate({ _id: req.params.id, id_usuario: req.auth.userId, status: 'Ativa' }, { $set: { status: 'Cancelada' } }, { new: true });
  if (!reserva) return res.status(404).json({ message: 'Reserva ativa não encontrada.' });
  res.status(204).send();
});

function resumo(reserva) { const livro = reserva.id_livro || {}; return { _id: reserva._id, status: reserva.status, createdAt: reserva.createdAt, livro: { _id: livro._id, titulo: livro.titulo, isbn: livro.isbn } }; }
module.exports = router;

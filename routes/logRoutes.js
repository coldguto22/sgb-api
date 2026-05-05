const express = require('express');
const router = express.Router();
const LogOperacao = require('../models/logOperacao');
const { autenticarApiKey } = require('../middleware/auth');

// GET /api/logs — Lista logs com filtros opcionais (RLOG04: apenas bibliotecários)
router.get('/', autenticarApiKey, async (req, res) => {
  try {
    const filtro = {};
    if (req.query.operacao)   filtro.operacao = req.query.operacao;
    if (req.query.id_usuario) filtro.id_usuario = req.query.id_usuario;
    if (req.query.data_inicio || req.query.data_fim) {
      filtro.data_hora = {};
      if (req.query.data_inicio) filtro.data_hora.$gte = new Date(req.query.data_inicio);
      if (req.query.data_fim)    filtro.data_hora.$lte = new Date(req.query.data_fim);
    }

    const logs = await LogOperacao.find(filtro)
      .populate('id_usuario', 'nome email tipo_usuario')
      .sort({ data_hora: -1 });

    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/logs/:id
router.get('/:id', autenticarApiKey, async (req, res) => {
  try {
    const log = await LogOperacao.findById(req.params.id).populate('id_usuario', 'nome email');
    if (!log) return res.status(404).json({ message: 'Log não encontrado' });
    res.json(log);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/logs — Registra nova operação no log
router.post('/', autenticarApiKey, async (req, res) => {
  const log = new LogOperacao({
    id_usuario:       req.body.id_usuario,
    operacao:         req.body.operacao,
    tabela_afetada:   req.body.tabela_afetada,
    registro_id:      req.body.registro_id,
    dados_anteriores: req.body.dados_anteriores,
    dados_novos:      req.body.dados_novos,
    ip_usuario:       req.ip || req.body.ip_usuario || '0.0.0.0',
    user_agent:       req.headers['user-agent'] || req.body.user_agent,
  });
  try {
    const novo = await log.save();
    res.status(201).json(novo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Logs são imutáveis — sem PUT nem DELETE (RLOG03)

module.exports = router;

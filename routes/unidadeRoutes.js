const express = require('express');
const router = express.Router();
const Unidade = require('../models/unidade');
const Andar = require('../models/andar');
const { autenticarApiKey } = require('../middleware/auth');

// GET /api/unidades — Público (documentado no SGB)
router.get('/', async (req, res) => {
  try {
    const unidades = await Unidade.find({ status: 'Ativa' });
    res.json(unidades);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/unidades/:id
router.get('/:id', getUnidade, (req, res) => {
  res.json(res.unidade);
});

// GET /api/unidades/:id/estantes — Estantes de uma unidade (público)
router.get('/:id/estantes', getUnidade, async (req, res) => {
  try {
    const andares = await Andar.find({ id_unidade: res.unidade._id });
    const andarIds = andares.map(a => a._id);
    const Estante = require('../models/estante');
    const estantes = await Estante.find({ id_andar: { $in: andarIds } })
      .populate('id_andar', 'numero_andar nome_andar');
    res.json({ unidade: res.unidade.nome, andares, estantes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/unidades
router.post('/', autenticarApiKey, async (req, res) => {
  const unidade = new Unidade({
    nome:                  req.body.nome,
    endereco:              req.body.endereco,
    cidade:                req.body.cidade,
    uf:                    req.body.uf,
    cep:                   req.body.cep,
    latitude:              req.body.latitude,
    longitude:             req.body.longitude,
    telefone:              req.body.telefone,
    horario_funcionamento: req.body.horario_funcionamento,
  });
  try {
    const nova = await unidade.save();
    res.status(201).json(nova);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/unidades/:id
router.put('/:id', autenticarApiKey, getUnidade, async (req, res) => {
  const campos = ['nome', 'endereco', 'cidade', 'uf', 'cep',
                  'latitude', 'longitude', 'telefone', 'horario_funcionamento', 'status'];
  campos.forEach(c => { if (req.body[c] != null) res.unidade[c] = req.body[c]; });
  try {
    const atualizada = await res.unidade.save();
    res.json(atualizada);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/unidades/:id
router.delete('/:id', autenticarApiKey, getUnidade, async (req, res) => {
  try {
    await res.unidade.deleteOne();
    res.json({ message: 'Unidade excluída com sucesso!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getUnidade(req, res, next) {
  try {
    const unidade = await Unidade.findById(req.params.id);
    if (!unidade) return res.status(404).json({ message: 'Unidade não encontrada' });
    res.unidade = unidade;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = router;

const express = require('express');
const router = express.Router();
const Unidade = require('../models/unidade');
const Andar = require('../models/andar');
const mongoose = require('mongoose');
const { autenticarApiKey } = require('../middleware/auth');

const PUBLIC_UNIT_FIELDS = '_id nome endereco cidade uf latitude longitude status';

function toPublicUnit({ _id, nome, endereco, cidade, uf, latitude, longitude, status }) {
  return { _id, nome, endereco, cidade, uf, latitude, longitude, status };
}

// GET /api/unidades — Público (documentado no SGB)
router.get('/', async (req, res) => {
  try {
    const unidades = await Unidade.find({ status: 'Ativa' }).select(PUBLIC_UNIT_FIELDS);
    res.json(unidades.map(toPublicUnit));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/unidades/:id
router.get('/:id', validateObjectId, getPublicUnidade, (req, res) => {
  res.json(toPublicUnit(res.unidade));
});

// GET /api/unidades/:id/andares — consulta pública com DTO mínimo
router.get('/:id/andares', validateObjectId, async (req, res) => {
  try {
    const unidade = await Unidade.findById(req.params.id).select('_id');
    if (!unidade) return res.status(404).json({ message: 'Unidade não encontrada' });

    const andares = await Andar.find({ id_unidade: unidade._id })
      .select('_id numero_andar nome_andar')
      .sort({ numero_andar: 1 });
    res.json(andares.map(({ _id, numero_andar, nome_andar }) => ({
      _id, numero_andar, nome_andar,
    })));
  } catch (err) {
    res.status(500).json({ message: 'Não foi possível consultar os andares' });
  }
});

// GET /api/unidades/:id/estantes — Estantes de uma unidade (público)
router.get('/:id/estantes', validateObjectId, async (req, res) => {
  try {
    const unidade = await Unidade.findById(req.params.id).select('_id nome');
    if (!unidade) return res.status(404).json({ message: 'Unidade não encontrada' });
    const andares = await Andar.find({ id_unidade: unidade._id })
      .select('_id numero_andar nome_andar');
    const andarIds = andares.map(a => a._id);
    const Estante = require('../models/estante');
    const estantes = await Estante.find({ id_andar: { $in: andarIds } })
      .select('_id id_andar codigo_estante descricao');
    res.json({
      unidade: { _id: unidade._id, nome: unidade.nome },
      andares: andares.map(({ _id, numero_andar, nome_andar }) => ({ _id, numero_andar, nome_andar })),
      estantes: estantes.map(({ _id, id_andar, codigo_estante, descricao }) => ({
        _id, id_andar, codigo_estante, descricao,
      })),
    });
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

async function getPublicUnidade(req, res, next) {
  try {
    const unidade = await Unidade.findById(req.params.id).select(PUBLIC_UNIT_FIELDS);
    if (!unidade) return res.status(404).json({ message: 'Unidade não encontrada' });
    res.unidade = unidade;
    next();
  } catch (err) {
    res.status(500).json({ message: 'Não foi possível consultar a unidade' });
  }
}

function validateObjectId(req, res, next) {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }
  next();
}

module.exports = router;


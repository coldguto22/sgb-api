const express = require('express');
const router = express.Router();
const Estante = require('../models/estante');
const Livro = require('../models/livro');
const { autenticarApiKey } = require('../middleware/auth');

router.get('/', autenticarApiKey, async (req, res) => {
  try {
    const estantes = await Estante.find()
      .populate({ path: 'id_andar', populate: { path: 'id_unidade', select: 'nome cidade' } });
    res.json(estantes);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/estantes/:id/livros — Livros de uma estante (público)
router.get('/:id/livros', async (req, res) => {
  try {
    const livros = await Livro.find({ estantes: req.params.id })
      .populate('id_categoria', 'nome')
      .populate('autores', 'nome');
    res.json(livros);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', autenticarApiKey, getEstante, (req, res) => res.json(res.estante));

router.post('/', autenticarApiKey, async (req, res) => {
  const estante = new Estante({
    id_andar:        req.body.id_andar,
    codigo_estante:  req.body.codigo_estante,
    descricao:       req.body.descricao,
    coordenada_x:    req.body.coordenada_x,
    coordenada_y:    req.body.coordenada_y,
    largura:         req.body.largura,
    altura:          req.body.altura,
    tipo:            req.body.tipo,
  });
  try {
    const nova = await estante.save();
    res.status(201).json(nova);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', autenticarApiKey, getEstante, async (req, res) => {
  ['id_andar', 'codigo_estante', 'descricao', 'coordenada_x',
   'coordenada_y', 'largura', 'altura', 'tipo'].forEach(c => {
    if (req.body[c] != null) res.estante[c] = req.body[c];
  });
  try { res.json(await res.estante.save()); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', autenticarApiKey, getEstante, async (req, res) => {
  try {
    await res.estante.deleteOne();
    res.json({ message: 'Estante excluída com sucesso!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getEstante(req, res, next) {
  try {
    const estante = await Estante.findById(req.params.id)
      .populate({ path: 'id_andar', populate: { path: 'id_unidade', select: 'nome' } });
    if (!estante) return res.status(404).json({ message: 'Estante não encontrada' });
    res.estante = estante;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = router;

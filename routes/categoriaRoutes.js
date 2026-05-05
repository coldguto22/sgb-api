const express = require('express');
const router = express.Router();
const Categoria = require('../models/categoria');
const { autenticarApiKey } = require('../middleware/auth');

// GET /api/categorias — Lista todas as categorias
router.get('/', autenticarApiKey, async (req, res) => {
  try {
    const categorias = await Categoria.find();
    res.json(categorias);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/categorias/:id — Busca categoria por ID
router.get('/:id', autenticarApiKey, getCategoria, (req, res) => {
  res.json(res.categoria);
});

// POST /api/categorias — Cria nova categoria
router.post('/', autenticarApiKey, async (req, res) => {
  const categoria = new Categoria({
    nome: req.body.nome,
    descricao: req.body.descricao,
  });
  try {
    const nova = await categoria.save();
    res.status(201).json(nova);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/categorias/:id — Atualiza categoria
router.put('/:id', autenticarApiKey, getCategoria, async (req, res) => {
  if (req.body.nome != null)      res.categoria.nome = req.body.nome;
  if (req.body.descricao != null) res.categoria.descricao = req.body.descricao;
  try {
    const atualizada = await res.categoria.save();
    res.json(atualizada);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/categorias/:id — Remove categoria
router.delete('/:id', autenticarApiKey, getCategoria, async (req, res) => {
  try {
    await res.categoria.deleteOne();
    res.json({ message: 'Categoria excluída com sucesso!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getCategoria(req, res, next) {
  try {
    const categoria = await Categoria.findById(req.params.id);
    if (!categoria) return res.status(404).json({ message: 'Categoria não encontrada' });
    res.categoria = categoria;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = router;

const express = require('express');
const router = express.Router();
const Autor = require('../models/autor');
const { autenticarApiKey } = require('../middleware/auth');

// GET /api/autores
router.get('/', autenticarApiKey, async (req, res) => {
  try {
    const autores = await Autor.find();
    res.json(autores);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/autores/:id
router.get('/:id', autenticarApiKey, getAutor, (req, res) => {
  res.json(res.autor);
});

// POST /api/autores
router.post('/', autenticarApiKey, async (req, res) => {
  const autor = new Autor({
    nome: req.body.nome,
    nacionalidade: req.body.nacionalidade,
  });
  try {
    const novo = await autor.save();
    res.status(201).json(novo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/autores/:id
router.put('/:id', autenticarApiKey, getAutor, async (req, res) => {
  if (req.body.nome != null)         res.autor.nome = req.body.nome;
  if (req.body.nacionalidade != null) res.autor.nacionalidade = req.body.nacionalidade;
  try {
    const atualizado = await res.autor.save();
    res.json(atualizado);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/autores/:id
router.delete('/:id', autenticarApiKey, getAutor, async (req, res) => {
  try {
    await res.autor.deleteOne();
    res.json({ message: 'Autor excluído com sucesso!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getAutor(req, res, next) {
  try {
    const autor = await Autor.findById(req.params.id);
    if (!autor) return res.status(404).json({ message: 'Autor não encontrado' });
    res.autor = autor;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = router;

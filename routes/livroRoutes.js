const express = require('express');
const router = express.Router();
const Livro = require('../models/livro');
const { autenticarApiKey } = require('../middleware/auth');

// GET /api/livros — Lista todos os livros (com populate de categoria e autores)
router.get('/', autenticarApiKey, async (req, res) => {
  try {
    const livros = await Livro.find()
      .populate('id_categoria', 'nome')
      .populate('autores', 'nome nacionalidade')
      .populate({ path: 'estantes', populate: { path: 'id_andar', populate: { path: 'id_unidade', select: 'nome cidade' } } });
    res.json(livros);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/livros/disponiveis — Livros com quantidade_disponivel > 0
router.get('/disponiveis', autenticarApiKey, async (req, res) => {
  try {
    const livros = await Livro.find({ quantidade_disponivel: { $gt: 0 } })
      .populate('id_categoria', 'nome')
      .populate('autores', 'nome');
    res.json(livros);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/livros/buscar?q=termo — Busca por título ou ISBN
router.get('/buscar', autenticarApiKey, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ message: 'Parâmetro de busca "q" é obrigatório.' });
  try {
    const livros = await Livro.find({
      $or: [
        { titulo: { $regex: q, $options: 'i' } },
        { isbn: q },
      ],
    })
      .populate('id_categoria', 'nome')
      .populate('autores', 'nome')
      .populate({ path: 'estantes', populate: { path: 'id_andar', populate: { path: 'id_unidade', select: 'nome cidade' } } });
    res.json(livros);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/livros/categoria/:id — Livros por categoria
router.get('/categoria/:id', autenticarApiKey, async (req, res) => {
  try {
    const livros = await Livro.find({ id_categoria: req.params.id })
      .populate('id_categoria', 'nome')
      .populate('autores', 'nome');
    res.json(livros);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/livros/localizacao/:id — Localização física do livro
router.get('/localizacao/:id', async (req, res) => {
  try {
    const livro = await Livro.findById(req.params.id)
      .populate({
        path: 'estantes',
        populate: {
          path: 'id_andar',
          populate: { path: 'id_unidade', select: 'nome cidade endereco latitude longitude' }
        }
      });
    if (!livro) return res.status(404).json({ message: 'Livro não encontrado' });
    res.json({ titulo: livro.titulo, isbn: livro.isbn, estantes: livro.estantes });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/livros/:id
router.get('/:id', autenticarApiKey, getLivro, (req, res) => {
  res.json(res.livro);
});

// POST /api/livros
router.post('/', autenticarApiKey, async (req, res) => {
  const livro = new Livro({
    titulo:                req.body.titulo,
    isbn:                  req.body.isbn,
    ano_publicacao:        req.body.ano_publicacao,
    editora:               req.body.editora,
    quantidade_total:      req.body.quantidade_total,
    quantidade_disponivel: req.body.quantidade_disponivel ?? req.body.quantidade_total,
    id_categoria:          req.body.id_categoria,
    autores:               req.body.autores ?? [],
    estantes:              req.body.estantes ?? [],
  });
  try {
    const novo = await livro.save();
    res.status(201).json(novo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/livros/:id
router.put('/:id', autenticarApiKey, getLivro, async (req, res) => {
  const campos = ['titulo', 'isbn', 'ano_publicacao', 'editora',
                  'quantidade_total', 'quantidade_disponivel',
                  'id_categoria', 'autores', 'estantes'];
  campos.forEach(c => { if (req.body[c] != null) res.livro[c] = req.body[c]; });
  try {
    const atualizado = await res.livro.save();
    res.json(atualizado);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/livros/:id
router.delete('/:id', autenticarApiKey, getLivro, async (req, res) => {
  try {
    await res.livro.deleteOne();
    res.json({ message: 'Livro excluído com sucesso!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getLivro(req, res, next) {
  try {
    const livro = await Livro.findById(req.params.id)
      .populate('id_categoria', 'nome')
      .populate('autores', 'nome nacionalidade');
    if (!livro) return res.status(404).json({ message: 'Livro não encontrado' });
    res.livro = livro;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = router;

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Livro = require('../models/livro');
const LogOperacao = require('../models/logOperacao');
const { autenticarApiKey, autenticarUsuario, exigirPapeis } = require('../middleware/auth');

const MAX_PAGE_SIZE = 50;

// GET /api/livros/catalogo — consulta paginada para o client, com filtros allowlist.
router.get('/catalogo', autenticarApiKey, async (req, res) => {
  const pagina = parsePositiveInteger(req.query.pagina, 1);
  const limite = Math.min(parsePositiveInteger(req.query.limite, 20), MAX_PAGE_SIZE);
  const filtro = {};

  if (req.query.categoria != null) {
    if (!mongoose.Types.ObjectId.isValid(req.query.categoria)) {
      return res.status(400).json({ message: 'Categoria inválida.' });
    }
    filtro.id_categoria = req.query.categoria;
  }
  if (req.query.autor != null) {
    if (!mongoose.Types.ObjectId.isValid(req.query.autor)) {
      return res.status(400).json({ message: 'Autor inválido.' });
    }
    filtro.autores = req.query.autor;
  }
  if (req.query.disponivel != null) {
    if (req.query.disponivel !== 'true' && req.query.disponivel !== 'false') {
      return res.status(400).json({ message: 'Filtro de disponibilidade inválido.' });
    }
    if (req.query.disponivel === 'true') filtro.quantidade_disponivel = { $gt: 0 };
  }

  try {
    const [livros, total] = await Promise.all([
      Livro.find(filtro)
        .select('_id titulo autores quantidade_disponivel id_categoria')
        .populate('autores', 'nome')
        .populate('id_categoria', 'nome')
        .sort({ titulo: 1 })
        .skip((pagina - 1) * limite)
        .limit(limite),
      Livro.countDocuments(filtro),
    ]);
    return res.json({
      items: livros.map(toCatalogItem),
      pagina,
      limite,
      total,
    });
  } catch (_) {
    return res.status(500).json({ message: 'Não foi possível consultar o catálogo.' });
  }
});

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function toCatalogItem(livro) {
  return {
    _id: livro._id,
    titulo: livro.titulo,
    autores: (livro.autores || []).map(({ nome }) => ({ nome })),
    quantidade_disponivel: livro.quantidade_disponivel,
    id_categoria: livro.id_categoria
      ? { _id: livro.id_categoria._id, nome: livro.id_categoria.nome }
      : null,
  };
}

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
router.get('/:id/recomendacoes', autenticarApiKey, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ message: 'Livro inválido.' });
  try {
    const livro = await Livro.findById(req.params.id).select('id_categoria');
    if (!livro) return res.status(404).json({ message: 'Livro não encontrado.' });
    const filtro = { _id: { $ne: livro._id } };
    if (livro.id_categoria) filtro.id_categoria = livro.id_categoria;
    const recomendados = await Livro.find(filtro)
      .select('_id titulo autores quantidade_disponivel')
      .populate('autores', 'nome')
      .sort({ quantidade_disponivel: -1, titulo: 1 })
      .limit(6);
    res.json(recomendados.map((item) => ({
      _id: item._id, titulo: item.titulo,
      autores: (item.autores || []).map((autor) => ({ nome: autor.nome })),
      quantidade_disponivel: item.quantidade_disponivel,
    })));
  } catch (_) { res.status(500).json({ message: 'Não foi possível gerar recomendações.' }); }
});
router.get('/:id', autenticarApiKey, getLivro, (req, res) => {
  res.json(res.livro);
});

// POST /api/livros
router.post('/', autenticarUsuario, exigirPapeis('Bibliotecario'), async (req, res) => {
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
    if (!estoqueValido(livro)) return res.status(400).json({ message: 'Estoque indisponível não pode exceder o total.' });
    const novo = await livro.save();
    await registrarAuditoria(req, 'CADASTRO_LIVRO', novo._id);
    res.status(201).json(novo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/livros/:id
router.put('/:id', autenticarUsuario, exigirPapeis('Bibliotecario'), getLivro, async (req, res) => {
  const campos = ['titulo', 'isbn', 'ano_publicacao', 'editora',
                  'quantidade_total', 'quantidade_disponivel',
                  'id_categoria', 'autores', 'estantes'];
  campos.forEach(c => { if (req.body[c] != null) res.livro[c] = req.body[c]; });
  try {
    if (!estoqueValido(res.livro)) return res.status(400).json({ message: 'Estoque indisponível não pode exceder o total.' });
    const atualizado = await res.livro.save();
    await registrarAuditoria(req, 'ATUALIZACAO_LIVRO', atualizado._id);
    res.json(atualizado);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/livros/:id
router.delete('/:id', autenticarUsuario, exigirPapeis('Bibliotecario'), getLivro, async (req, res) => {
  try {
    await res.livro.deleteOne();
    await registrarAuditoria(req, 'EXCLUSAO_LIVRO', res.livro._id);
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

function estoqueValido(livro) {
  return Number.isInteger(livro.quantidade_total) && Number.isInteger(livro.quantidade_disponivel) &&
    livro.quantidade_total >= 1 && livro.quantidade_disponivel >= 0 &&
    livro.quantidade_disponivel <= livro.quantidade_total;
}

async function registrarAuditoria(req, operacao, registroId) {
  try {
    await LogOperacao.create({ id_usuario: req.auth.userId, operacao, tabela_afetada: 'livros', registro_id: registroId.toString(), ip_usuario: req.ip || '0.0.0.0', user_agent: req.headers['user-agent'] });
  } catch (_) {}
}

module.exports = router;

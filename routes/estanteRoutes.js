const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Estante = require('../models/estante');
const Livro = require('../models/livro');
const { autenticarApiKey, autenticarUsuario, exigirPapeis } = require('../middleware/auth');

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

// POST /api/estantes/:id/livros — associa um título já existente à estante.
router.post('/:id/livros', autenticarUsuario, exigirPapeis('Bibliotecario'), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id) ||
      !mongoose.Types.ObjectId.isValid(req.body.id_livro)) {
    return res.status(400).json({ message: 'Estante ou livro inválido.' });
  }

  try {
    const [estante, livro] = await Promise.all([
      Estante.findById(req.params.id),
      Livro.findById(req.body.id_livro),
    ]);
    if (!estante || !livro) {
      return res.status(404).json({ message: 'Estante ou livro não encontrado.' });
    }

    const jaAssociado = livro.estantes.some((id) => id.equals(estante._id));
    if (!jaAssociado) {
      livro.estantes.push(estante._id);
      await livro.save();
    }
    return res.status(jaAssociado ? 200 : 201).json({
      livro_id: livro._id,
      estante_id: estante._id,
      associado: true,
    });
  } catch (_) {
    return res.status(500).json({ message: 'Não foi possível associar o livro à estante.' });
  }
});

// PUT /api/estantes/:id/livros/:livroId/mover — troca a localização física do título.
router.put('/:id/livros/:livroId/mover', autenticarUsuario, exigirPapeis('Bibliotecario'), async (req, res) => {
  const destinoId = req.body.id_estante_destino;
  if (!mongoose.Types.ObjectId.isValid(req.params.id) ||
      !mongoose.Types.ObjectId.isValid(req.params.livroId) ||
      !mongoose.Types.ObjectId.isValid(destinoId)) {
    return res.status(400).json({ message: 'Estante de origem, destino ou livro inválido.' });
  }
  if (req.params.id === destinoId) {
    return res.status(400).json({ message: 'A estante de destino deve ser diferente da origem.' });
  }

  try {
    const [origem, destino, livro] = await Promise.all([
      Estante.findById(req.params.id),
      Estante.findById(destinoId),
      Livro.findById(req.params.livroId),
    ]);
    if (!origem || !destino || !livro) {
      return res.status(404).json({ message: 'Estante ou livro não encontrado.' });
    }
    if (!livro.estantes.some((id) => id.equals(origem._id))) {
      return res.status(409).json({ message: 'O livro não está associado à estante de origem.' });
    }

    livro.estantes = livro.estantes.filter((id) => !id.equals(origem._id));
    if (!livro.estantes.some((id) => id.equals(destino._id))) {
      livro.estantes.push(destino._id);
    }
    await livro.save();
    return res.json({
      livro_id: livro._id,
      estante_origem_id: origem._id,
      estante_destino_id: destino._id,
      movido: true,
    });
  } catch (_) {
    return res.status(500).json({ message: 'Não foi possível mover o livro entre estantes.' });
  }
});

// DELETE /api/estantes/:id/livros/:livroId — remove apenas a associação física.
router.delete('/:id/livros/:livroId', autenticarUsuario, exigirPapeis('Bibliotecario'), async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id) ||
      !mongoose.Types.ObjectId.isValid(req.params.livroId)) {
    return res.status(400).json({ message: 'Estante ou livro inválido.' });
  }

  try {
    const livro = await Livro.findById(req.params.livroId);
    if (!livro) return res.status(404).json({ message: 'Livro não encontrado.' });
    livro.estantes.pull(req.params.id);
    await livro.save();
    return res.json({ livro_id: livro._id, estante_id: req.params.id, associado: false });
  } catch (_) {
    return res.status(500).json({ message: 'Não foi possível remover o livro da estante.' });
  }
});

router.get('/:id', autenticarApiKey, getEstante, (req, res) => res.json(res.estante));

router.post('/', autenticarUsuario, exigirPapeis('Bibliotecario'), async (req, res) => {
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

router.put('/:id', autenticarUsuario, exigirPapeis('Bibliotecario'), getEstante, async (req, res) => {
  ['id_andar', 'codigo_estante', 'descricao', 'coordenada_x',
   'coordenada_y', 'largura', 'altura', 'tipo'].forEach(c => {
    if (req.body[c] != null) res.estante[c] = req.body[c];
  });
  try { res.json(await res.estante.save()); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', autenticarUsuario, exigirPapeis('Bibliotecario'), getEstante, async (req, res) => {
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

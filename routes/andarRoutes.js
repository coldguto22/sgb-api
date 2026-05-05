const express = require('express');
const router = express.Router();
const Andar = require('../models/andar');
const { autenticarApiKey } = require('../middleware/auth');

router.get('/', autenticarApiKey, async (req, res) => {
  try {
    const andares = await Andar.find().populate('id_unidade', 'nome cidade');
    res.json(andares);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', autenticarApiKey, getAndar, (req, res) => res.json(res.andar));

router.post('/', autenticarApiKey, async (req, res) => {
  const andar = new Andar({
    id_unidade:    req.body.id_unidade,
    numero_andar:  req.body.numero_andar,
    nome_andar:    req.body.nome_andar,
    descricao:     req.body.descricao,
  });
  try {
    const novo = await andar.save();
    res.status(201).json(novo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/:id', autenticarApiKey, getAndar, async (req, res) => {
  ['id_unidade', 'numero_andar', 'nome_andar', 'descricao'].forEach(c => {
    if (req.body[c] != null) res.andar[c] = req.body[c];
  });
  try { res.json(await res.andar.save()); }
  catch (err) { res.status(400).json({ message: err.message }); }
});

router.delete('/:id', autenticarApiKey, getAndar, async (req, res) => {
  try {
    await res.andar.deleteOne();
    res.json({ message: 'Andar excluído com sucesso!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getAndar(req, res, next) {
  try {
    const andar = await Andar.findById(req.params.id).populate('id_unidade', 'nome');
    if (!andar) return res.status(404).json({ message: 'Andar não encontrado' });
    res.andar = andar;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = router;

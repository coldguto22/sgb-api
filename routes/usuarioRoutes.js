const express = require('express');
const router = express.Router();
const Usuario = require('../models/usuario');
const { autenticarUsuario, exigirPapeis } = require('../middleware/auth');

// GET /api/usuarios
router.get('/', autenticarUsuario, exigirPapeis('Bibliotecario'), async (req, res) => {
  try {
    const busca = typeof req.query.busca === 'string' ? req.query.busca.trim() : '';
    if (busca.length === 1) {
      return res.status(400).json({ message: 'Informe ao menos dois caracteres para buscar usuários.' });
    }
    const filtro = busca
      ? { $or: [
        { nome: { $regex: escapeRegex(busca), $options: 'i' } },
        { email: { $regex: escapeRegex(busca), $options: 'i' } },
      ] }
      : {};
    const usuarios = await Usuario.find(filtro);
    res.json(usuarios.map(resumoUsuarioOperacional));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function resumoUsuarioOperacional(usuario) {
  return {
    _id: usuario._id,
    nome: usuario.nome,
    email: usuario.email,
    tipo_usuario: usuario.tipo_usuario,
    status: usuario.status,
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// GET /api/usuarios/:id
router.get('/:id', autenticarUsuario, podeAcessarUsuario, getUsuario, (req, res) => {
  res.json(res.usuario);
});

// POST /api/usuarios
router.post('/', autenticarUsuario, exigirPapeis('Bibliotecario'), async (req, res) => {
  const usuario = new Usuario({
    nome:         req.body.nome,
    cpf:          req.body.cpf,
    email:        req.body.email,
    senha:        req.body.senha,
    telefone:     req.body.telefone,
    tipo_usuario: req.body.tipo_usuario,
  });
  try {
    const novo = await usuario.save();
    res.status(201).json(novo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', autenticarUsuario, podeAcessarUsuario, getUsuario, async (req, res) => {
  if (req.body.nome != null)         res.usuario.nome = req.body.nome;
  if (req.body.email != null)        res.usuario.email = req.body.email;
  if (req.body.telefone != null)     res.usuario.telefone = req.body.telefone;
  if (req.auth.role === 'Bibliotecario' && req.body.tipo_usuario != null) res.usuario.tipo_usuario = req.body.tipo_usuario;
  if (req.auth.role === 'Bibliotecario' && req.body.status != null)       res.usuario.status = req.body.status;
  if (req.body.senha != null)        res.usuario.senha = req.body.senha;
  try {
    const atualizado = await res.usuario.save();
    res.json(atualizado);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /api/usuarios/:id
router.delete('/:id', autenticarUsuario, exigirPapeis('Bibliotecario'), getUsuario, async (req, res) => {
  try {
    await res.usuario.deleteOne();
    res.json({ message: 'Usuário excluído com sucesso!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function podeAcessarUsuario(req, res, next) {
  if (req.auth.role === 'Bibliotecario' || req.auth.userId === req.params.id) return next();
  return res.status(403).json({ message: 'Acesso não autorizado.' });
}

async function getUsuario(req, res, next) {
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.usuario = usuario;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = router;

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Usuario = require('../models/usuario');
const LogOperacao = require('../models/logOperacao');
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
router.get('/:id', autenticarUsuario, exigirPapeis('Bibliotecario'), getUsuario, (req, res) => {
  res.json(resumoUsuarioOperacional(res.usuario));
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
    await registrarAuditoria(req, 'CADASTRO_USUARIO', novo._id);
    res.status(201).json(resumoUsuarioOperacional(novo));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/usuarios/:id
router.put('/:id', autenticarUsuario, exigirPapeis('Bibliotecario'), getUsuario, async (req, res) => {
  const camposPermitidos = ['nome', 'email', 'telefone', 'tipo_usuario', 'status'];
  camposPermitidos.forEach((campo) => {
    if (req.body[campo] != null) res.usuario[campo] = req.body[campo];
  });
  try {
    const atualizado = await res.usuario.save();
    await registrarAuditoria(req, 'ATUALIZACAO_USUARIO', atualizado._id);
    res.json(resumoUsuarioOperacional(atualizado));
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
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ message: 'Identificador invalido.' });
  }
  try {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) return res.status(404).json({ message: 'Usuário não encontrado' });
    res.usuario = usuario;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

async function registrarAuditoria(req, operacao, registroId) {
  try {
    await LogOperacao.create({
      id_usuario: req.auth.userId,
      operacao,
      tabela_afetada: 'usuarios',
      registro_id: registroId.toString(),
      ip_usuario: req.ip || '0.0.0.0',
      user_agent: req.headers['user-agent'],
    });
  } catch (_) {
    // Auditoria nao desfaz uma alteracao ja persistida.
  }
}

module.exports = router;

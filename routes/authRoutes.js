const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/usuario');
const { autenticarUsuario, criarTokenAcesso } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Tente novamente mais tarde.' },
});

router.post('/login', loginLimiter, async (req, res) => {
  const email = typeof req.body.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : '';
  const senha = typeof req.body.senha === 'string' ? req.body.senha : '';
  if (!email || !senha) {
    return res.status(400).json({ message: 'E-mail e senha são obrigatórios.' });
  }

  try {
    const usuario = await Usuario.findOne({ email }).select('+senha +token_version');
    const senhaValida = usuario && await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }
    if (usuario.status !== 'Ativo') {
      return res.status(403).json({ message: 'Usuário não está ativo.' });
    }

    const accessToken = criarTokenAcesso(usuario);
    return res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 900,
      user: {
        id: usuario._id,
        nome: usuario.nome,
        tipo_usuario: usuario.tipo_usuario,
      },
    });
  } catch (_) {
    return res.status(503).json({ message: 'Serviço de autenticação indisponível.' });
  }
});

router.get('/me', autenticarUsuario, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.auth.userId).select(
      'nome email tipo_usuario status',
    );
    if (!usuario) return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
    return res.json(usuario);
  } catch (_) {
    return res.status(503).json({ message: 'Serviço de autenticação indisponível.' });
  }
});

router.post('/logout', autenticarUsuario, async (req, res) => {
  try {
    await Usuario.findByIdAndUpdate(req.auth.userId, { $inc: { token_version: 1 } });
    return res.status(204).send();
  } catch (_) {
    return res.status(503).json({ message: 'Serviço de autenticação indisponível.' });
  }
});

module.exports = router;

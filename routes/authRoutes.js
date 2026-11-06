const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Usuario = require('../models/usuario');
const { autenticarUsuario, criarTokenAcesso } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../services/passwordResetEmail');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Tente novamente mais tarde.' },
});

const passwordRecoveryLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Tente novamente mais tarde.' },
});

const passwordResetLifetimeMs = 30 * 60 * 1000;
const recoveryMessage = {
  message: 'Se houver uma conta ativa para este e-mail, enviaremos as instruções de recuperação.',
};

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

router.post('/recuperacao-senha', passwordRecoveryLimiter, async (req, res) => {
  const email = typeof req.body.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : '';
  if (!email) return res.status(202).json(recoveryMessage);

  try {
    const usuario = await Usuario.findOne({ email }).select(
      '+password_reset_token_hash +password_reset_expires_at',
    );
    if (!usuario || usuario.status !== 'Ativo') {
      return res.status(202).json(recoveryMessage);
    }
    const token = crypto.randomBytes(32).toString('hex');
    usuario.password_reset_token_hash = hashResetToken(token);
    usuario.password_reset_expires_at = new Date(Date.now() + passwordResetLifetimeMs);
    await usuario.save();
    try {
      await sendPasswordResetEmail({ to: usuario.email, token });
    } catch (_) {
      usuario.password_reset_token_hash = null;
      usuario.password_reset_expires_at = null;
      await usuario.save();
      return res.status(503).json({ message: 'Serviço de recuperação indisponível.' });
    }
    return res.status(202).json(recoveryMessage);
  } catch (_) {
    return res.status(503).json({ message: 'Serviço de recuperação indisponível.' });
  }
});

router.post('/recuperacao-senha/confirmar', async (req, res) => {
  const token = typeof req.body.token === 'string' ? req.body.token : '';
  const senha = typeof req.body.senha === 'string' ? req.body.senha : '';
  if (!token || senha.length < 12) {
    return res.status(400).json({ message: 'Token e senha válida são obrigatórios.' });
  }
  try {
    const usuario = await Usuario.findOne({
      password_reset_token_hash: hashResetToken(token),
      password_reset_expires_at: { $gt: new Date() },
    }).select('+senha +token_version +password_reset_token_hash +password_reset_expires_at');
    if (!usuario) {
      return res.status(400).json({ message: 'Token inválido ou expirado.' });
    }
    usuario.senha = senha;
    usuario.password_reset_token_hash = null;
    usuario.password_reset_expires_at = null;
    usuario.token_version = (usuario.token_version || 0) + 1;
    await usuario.save();
    return res.status(204).send();
  } catch (_) {
    return res.status(503).json({ message: 'Serviço de recuperação indisponível.' });
  }
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
      'nome email telefone tipo_usuario status',
    );
    if (!usuario) return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
    return res.json(perfilPublico(usuario));
  } catch (_) {
    return res.status(503).json({ message: 'Serviço de autenticação indisponível.' });
  }
});

router.put('/me', autenticarUsuario, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.auth.userId).select(
      'nome email telefone tipo_usuario status',
    );
    if (!usuario) return res.status(401).json({ message: 'Sessão inválida ou expirada.' });

    if (typeof req.body.nome === 'string') usuario.nome = req.body.nome.trim();
    if (typeof req.body.email === 'string') usuario.email = req.body.email.trim().toLowerCase();
    if (typeof req.body.telefone === 'string') usuario.telefone = req.body.telefone.trim();

    const atualizado = await usuario.save();
    return res.json(perfilPublico(atualizado));
  } catch (_) {
    return res.status(400).json({ message: 'Não foi possível atualizar o perfil.' });
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

function perfilPublico(usuario) {
  return {
    id: usuario._id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone || null,
    tipo_usuario: usuario.tipo_usuario,
    status: usuario.status,
  };
}

module.exports = router;

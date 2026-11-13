const express = require('express');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { authenticator } = require('otplib');
const Usuario = require('../models/usuario');
const { autenticarUsuario, criarTokenAcesso, criarTokenRenovacao, exigirPapeis } = require('../middleware/auth');
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
    const usuario = await Usuario.findOne({ email }).select('+senha +token_version +mfa_secret');
    const senhaValida = usuario && await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) {
      return res.status(401).json({ message: 'Credenciais inválidas.' });
    }
    if (usuario.status !== 'Ativo') {
      return res.status(403).json({ message: 'Usuário não está ativo.' });
    }
    if (usuario.mfa_ativado && !authenticator.check(req.body.codigo_mfa || '', usuario.mfa_secret)) {
      return res.status(401).json({ message: 'Código de autenticação inválido.' });
    }

    const accessToken = criarTokenAcesso(usuario);
    const refreshToken = criarTokenRenovacao(usuario);
    return res.json({
      access_token: accessToken,
      refresh_token: refreshToken,
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

router.post('/renovar-sessao', async (req, res) => {
  const refreshToken = typeof req.body.refresh_token === 'string'
    ? req.body.refresh_token
    : '';
  if (!refreshToken) return res.status(400).json({ message: 'Token de renovação obrigatório.' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_SECRET, {
      algorithms: ['HS256'], issuer: 'sgb-api', audience: 'sgb-flutter',
    });
    if (payload.type !== 'refresh') throw new Error('Tipo de token inválido');
    const usuario = await Usuario.findById(payload.sub).select('+token_version');
    if (!usuario || usuario.status !== 'Ativo' || usuario.token_version !== payload.version) {
      return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
    }
    return res.json({
      access_token: criarTokenAcesso(usuario),
      refresh_token: criarTokenRenovacao(usuario),
      token_type: 'Bearer',
      expires_in: 900,
      user: { id: usuario._id, nome: usuario.nome, tipo_usuario: usuario.tipo_usuario },
    });
  } catch (_) {
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }
});

router.post('/mfa/provisionar', autenticarUsuario, exigirPapeis('Bibliotecario'), async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.auth.userId).select('+mfa_pending_secret');
    if (!usuario) return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
    const secret = authenticator.generateSecret();
    usuario.mfa_pending_secret = secret;
    await usuario.save();
    return res.json({
      secret,
      otpauth_url: authenticator.keyuri(usuario.email, 'SGB FATEC', secret),
    });
  } catch (_) {
    return res.status(503).json({ message: 'Serviço MFA indisponível.' });
  }
});

router.post('/mfa/ativar', autenticarUsuario, exigirPapeis('Bibliotecario'), async (req, res) => {
  const codigo = typeof req.body.codigo === 'string' ? req.body.codigo : '';
  try {
    const usuario = await Usuario.findById(req.auth.userId).select('+mfa_pending_secret +mfa_secret');
    if (!usuario || !usuario.mfa_pending_secret || !authenticator.check(codigo, usuario.mfa_pending_secret)) {
      return res.status(400).json({ message: 'Código MFA inválido.' });
    }
    usuario.mfa_secret = usuario.mfa_pending_secret;
    usuario.mfa_pending_secret = null;
    usuario.mfa_ativado = true;
    await usuario.save();
    return res.status(204).send();
  } catch (_) {
    return res.status(503).json({ message: 'Serviço MFA indisponível.' });
  }
});

router.post('/mfa/desativar', autenticarUsuario, exigirPapeis('Bibliotecario'), async (req, res) => {
  const codigo = typeof req.body.codigo === 'string' ? req.body.codigo : '';
  try {
    const usuario = await Usuario.findById(req.auth.userId).select('+mfa_secret');
    if (!usuario || !usuario.mfa_ativado || !authenticator.check(codigo, usuario.mfa_secret)) {
      return res.status(400).json({ message: 'Código MFA inválido.' });
    }
    usuario.mfa_secret = null;
    usuario.mfa_ativado = false;
    await usuario.save();
    return res.status(204).send();
  } catch (_) {
    return res.status(503).json({ message: 'Serviço MFA indisponível.' });
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

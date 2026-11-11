const crypto = require('crypto');
const express = require('express');
const Usuario = require('../models/usuario');
const { sendPasswordResetEmail } = require('../services/passwordResetEmail');

const router = express.Router();
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const GENERIC_REQUEST_RESPONSE = {
  message: 'Se houver uma conta ativa para este e-mail, enviaremos as instruções de recuperação.',
};

// POST /api/auth/recuperacao-senha
// Always returns the same response to avoid revealing whether an email exists.
router.post('/recuperacao-senha', async (req, res) => {
  const email = typeof req.body.email === 'string'
    ? req.body.email.trim().toLowerCase()
    : '';

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(202).json(GENERIC_REQUEST_RESPONSE);
  }

  try {
    const usuario = await Usuario.findOne({ email, status: 'Ativo' });
    if (!usuario) return res.status(202).json(GENERIC_REQUEST_RESPONSE);

    const token = crypto.randomBytes(32).toString('hex');
    usuario.password_reset_token_hash = crypto.createHash('sha256').update(token).digest('hex');
    usuario.password_reset_expires_at = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    await usuario.save();

    await sendPasswordResetEmail({ recipient: usuario.email, token });
  } catch (error) {
    // Do not log addresses, reset tokens, or provider response content.
    console.error('Falha ao processar solicitação de redefinição de senha.');
  }

  return res.status(202).json(GENERIC_REQUEST_RESPONSE);
});

// POST /api/auth/recuperacao-senha/confirmar
router.post('/recuperacao-senha/confirmar', async (req, res) => {
  const token = typeof req.body.token === 'string' ? req.body.token.trim() : '';
  const senha = typeof req.body.senha === 'string' ? req.body.senha : '';

  if (!/^[a-f0-9]{64}$/.test(token) || senha.length < 12 || senha.length > 128) {
    return res.status(400).json({ message: 'Código inválido ou senha fora da política exigida.' });
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  try {
    const usuario = await Usuario.findOneAndUpdate({
      password_reset_token_hash: tokenHash,
      password_reset_expires_at: { $gt: new Date() },
      status: 'Ativo',
    }, {
      $set: {
        password_reset_token_hash: null,
        password_reset_expires_at: null,
      },
    }, { new: true });

    if (!usuario) {
      return res.status(400).json({ message: 'Código inválido ou expirado.' });
    }

    usuario.senha = senha;
    await usuario.save();

    return res.status(200).json({ message: 'Senha redefinida com sucesso.' });
  } catch (error) {
    return res.status(500).json({ message: 'Não foi possível redefinir a senha agora.' });
  }
});

module.exports = router;

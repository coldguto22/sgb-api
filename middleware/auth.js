const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/usuario');
dotenv.config();

// Middleware de autenticação via API Key
function autenticarApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY_SECRET) {
    return res.status(401).json({ message: 'API Key inválida ou não fornecida.' });
  }
  next();
}

function jwtSecret() {
  return process.env.JWT_SECRET;
}

function criarTokenAcesso(usuario) {
  const secret = jwtSecret();
  if (!secret) throw new Error('JWT_SECRET não configurado');

  return jwt.sign(
    {
      role: usuario.tipo_usuario,
      version: usuario.token_version || 0,
    },
    secret,
    {
      algorithm: 'HS256',
      subject: usuario._id.toString(),
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      issuer: 'sgb-api',
      audience: 'sgb-flutter',
    },
  );
}

async function autenticarUsuario(req, res, next) {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Autenticação necessária.' });
  }

  const secret = jwtSecret();
  if (!secret) {
    return res.status(503).json({ message: 'Serviço de autenticação indisponível.' });
  }

  try {
    const payload = jwt.verify(authorization.slice(7), secret, {
      algorithms: ['HS256'],
      issuer: 'sgb-api',
      audience: 'sgb-flutter',
    });
    const usuario = await Usuario.findById(payload.sub).select(
      '_id status tipo_usuario +token_version',
    );

    if (
      !usuario ||
      usuario.status !== 'Ativo' ||
      usuario.token_version !== payload.version
    ) {
      return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
    }

    req.auth = {
      userId: usuario._id.toString(),
      role: usuario.tipo_usuario,
    };
    return next();
  } catch (_) {
    return res.status(401).json({ message: 'Sessão inválida ou expirada.' });
  }
}

function exigirPapeis(...papeis) {
  return (req, res, next) => {
    if (!req.auth || !papeis.includes(req.auth.role)) {
      return res.status(403).json({ message: 'Acesso não autorizado.' });
    }
    return next();
  };
}

module.exports = {
  autenticarApiKey,
  autenticarUsuario,
  criarTokenAcesso,
  exigirPapeis,
};

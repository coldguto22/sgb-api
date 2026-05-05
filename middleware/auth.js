const dotenv = require('dotenv');
dotenv.config();

// Middleware de autenticação via API Key
function autenticarApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_KEY_SECRET) {
    return res.status(401).json({ message: 'API Key inválida ou não fornecida.' });
  }
  next();
}

module.exports = { autenticarApiKey };

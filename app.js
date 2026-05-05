const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

// ── Rotas ──────────────────────────────────────────────────
const categoriaRouter  = require('./routes/categoriaRoutes');
const autorRouter      = require('./routes/autorRoutes');
const usuarioRouter    = require('./routes/usuarioRoutes');
const livroRouter      = require('./routes/livroRoutes');
const emprestimoRouter = require('./routes/emprestimoRoutes');
const unidadeRouter    = require('./routes/unidadeRoutes');
const andarRouter      = require('./routes/andarRoutes');
const estanteRouter    = require('./routes/estanteRoutes');
const logRouter        = require('./routes/logRoutes');

app.use('/api/categorias',  categoriaRouter);
app.use('/api/autores',     autorRouter);
app.use('/api/usuarios',    usuarioRouter);
app.use('/api/livros',      livroRouter);
app.use('/api/emprestimos', emprestimoRouter);
app.use('/api/unidades',    unidadeRouter);
app.use('/api/andares',     andarRouter);
app.use('/api/estantes',    estanteRouter);
app.use('/api/logs',        logRouter);

// ── Rota raiz ──────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    sistema: 'SGB - Sistema de Gerenciamento de Biblioteca',
    versao: '2.0',
    instituicao: 'FATEC Mauá',
    endpoints: [
      '/api/categorias', '/api/autores', '/api/usuarios',
      '/api/livros', '/api/emprestimos', '/api/unidades',
      '/api/andares', '/api/estantes', '/api/logs'
    ]
  });
});

// ── Rota não encontrada ────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: 'Rota não encontrada' });
});

// ── Conexão MongoDB ────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  mongoose.connect(process.env.MONGODB_URI);

  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'Erro de conexão ao MongoDB:'));
  db.once('open', () => console.log('Conectado ao MongoDB Atlas!'));
}

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Servidor SGB rodando na porta ${PORT}`));
}

module.exports = app;

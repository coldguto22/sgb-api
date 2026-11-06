const express = require('express');
const router = express.Router();
const Livro = require('../models/livro');
const Usuario = require('../models/usuario');
const Emprestimo = require('../models/emprestimo');
const { autenticarUsuario, exigirPapeis } = require('../middleware/auth');

router.get('/resumo', autenticarUsuario, exigirPapeis('Bibliotecario'), async (_req, res) => {
  try {
    const [livros, usuarios, ativos, atrasados] = await Promise.all([
      Livro.countDocuments(),
      Usuario.countDocuments({ status: 'Ativo' }),
      Emprestimo.countDocuments({ status: 'Ativo' }),
      Emprestimo.countDocuments({ status: 'Atrasado' }),
    ]);
    res.json({ livros, usuarios_ativos: usuarios, emprestimos_ativos: ativos, emprestimos_atrasados: atrasados });
  } catch (_) {
    res.status(500).json({ message: 'Não foi possível gerar o resumo operacional.' });
  }
});
module.exports = router;

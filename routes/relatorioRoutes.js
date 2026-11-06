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

router.get('/mais-emprestados', autenticarUsuario, exigirPapeis('Bibliotecario'), async (_req, res) => {
  try {
    const itens = await Emprestimo.aggregate([
      { $group: { _id: '$id_livro', total: { $sum: 1 } } },
      { $sort: { total: -1 } }, { $limit: 10 },
      { $lookup: { from: 'livros', localField: '_id', foreignField: '_id', as: 'livro' } },
      { $unwind: '$livro' },
      { $project: { _id: 0, livro_id: '$_id', titulo: '$livro.titulo', total: 1 } },
    ]);
    res.json(itens);
  } catch (_) { res.status(500).json({ message: 'Não foi possível gerar o relatório.' }); }
});

router.get('/multas', autenticarUsuario, exigirPapeis('Bibliotecario'), async (_req, res) => {
  try {
    const [resultado] = await Emprestimo.aggregate([
      { $match: { valor_multa: { $gt: 0 } } },
      { $group: { _id: null, quantidade: { $sum: 1 }, valor_total: { $sum: '$valor_multa' } } },
      { $project: { _id: 0, quantidade: 1, valor_total: 1 } },
    ]);
    res.json(resultado || { quantidade: 0, valor_total: 0 });
  } catch (_) { res.status(500).json({ message: 'Não foi possível gerar o relatório.' }); }
});
module.exports = router;

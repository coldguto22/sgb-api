const express = require('express');
const router = express.Router();
const Emprestimo = require('../models/emprestimo');
const Livro = require('../models/livro');
const Usuario = require('../models/usuario');
const { autenticarApiKey } = require('../middleware/auth');

const MULTA_DIARIA = parseFloat(process.env.MULTA_DIARIA || '2.00');
const MULTA_MAXIMA = parseFloat(process.env.MULTA_MAXIMA || '50.00');
const PRAZO_ALUNO = parseInt(process.env.PRAZO_ALUNO || '7');
const PRAZO_PROFESSOR = parseInt(process.env.PRAZO_PROFESSOR || '14');
const LIMITE_ALUNO = parseInt(process.env.LIMITE_ALUNO || '3');
const LIMITE_PROFESSOR = parseInt(process.env.LIMITE_PROFESSOR || '5');

// GET /api/emprestimos
router.get('/', autenticarApiKey, async (req, res) => {
  try {
    const emprestimos = await Emprestimo.find()
      .populate('id_usuario', 'nome email tipo_usuario')
      .populate('id_livro', 'titulo isbn');
    res.json(emprestimos);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/emprestimos/atrasados — Empréstimos com status Atrasado
router.get('/atrasados', autenticarApiKey, async (req, res) => {
  try {
    const hoje = new Date();
    // Atualiza status de atrasados
    await Emprestimo.updateMany(
      { status: 'Ativo', data_prevista_devolucao: { $lt: hoje } },
      { $set: { status: 'Atrasado' } }
    );
    const atrasados = await Emprestimo.find({ status: 'Atrasado' })
      .populate('id_usuario', 'nome email')
      .populate('id_livro', 'titulo isbn');
    res.json(atrasados);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/emprestimos/:id
router.get('/:id', autenticarApiKey, getEmprestimo, (req, res) => {
  res.json(res.emprestimo);
});

// POST /api/emprestimos — Realiza novo empréstimo (RF06)
router.post('/', autenticarApiKey, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.body.id_usuario);
    if (!usuario) return res.status(404).json({ message: 'Usuário não encontrado' });
    if (usuario.status === 'Bloqueado')
      return res.status(400).json({ message: 'Usuário bloqueado. Não pode realizar empréstimos.' });

    // RG RE03: verifica multas pendentes
    const multaPendente = await Emprestimo.findOne({
      id_usuario: usuario._id, valor_multa: { $gt: 0 }, status: { $ne: 'Finalizado' }
    });
    if (multaPendente)
      return res.status(400).json({ message: 'Usuário possui multas pendentes. Regularize antes de realizar novos empréstimos.' });

    // RE02: limite de empréstimos simultâneos
    const limite = usuario.tipo_usuario === 'Professor' ? LIMITE_PROFESSOR : LIMITE_ALUNO;
    const emprestimosAtivos = await Emprestimo.countDocuments({
      id_usuario: usuario._id, status: { $in: ['Ativo', 'Atrasado'] }
    });
    if (emprestimosAtivos >= limite)
      return res.status(400).json({ message: `Limite de ${limite} empréstimos simultâneos atingido.` });

    const livro = await Livro.findById(req.body.id_livro);
    if (!livro) return res.status(404).json({ message: 'Livro não encontrado' });

    // RE04: livro disponível
    if (livro.quantidade_disponivel <= 0)
      return res.status(400).json({ message: 'Livro indisponível para empréstimo.' });

    // RE01: prazo conforme tipo de usuário
    const prazoDias = usuario.tipo_usuario === 'Professor' ? PRAZO_PROFESSOR : PRAZO_ALUNO;
    const dataPrevista = new Date();
    dataPrevista.setDate(dataPrevista.getDate() + prazoDias);

    const emprestimo = new Emprestimo({
      id_usuario:              usuario._id,
      id_livro:                livro._id,
      data_prevista_devolucao: req.body.data_prevista_devolucao || dataPrevista,
    });

    await emprestimo.save();
    livro.quantidade_disponivel -= 1;
    await livro.save();

    res.status(201).json(emprestimo);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/emprestimos/:id/devolver — Registra devolução (RF07 + RF08)
router.put('/:id/devolver', autenticarApiKey, getEmprestimo, async (req, res) => {
  if (res.emprestimo.status === 'Finalizado')
    return res.status(400).json({ message: 'Este empréstimo já foi finalizado.' });

  const hoje = new Date();
  res.emprestimo.data_devolucao_efetiva = hoje;

  // RM01/RM02: cálculo de multa
  const prevista = new Date(res.emprestimo.data_prevista_devolucao);
  if (hoje > prevista) {
    const diasAtraso = Math.ceil((hoje - prevista) / (1000 * 60 * 60 * 24));
    const multa = Math.min(diasAtraso * MULTA_DIARIA, MULTA_MAXIMA);
    res.emprestimo.valor_multa = multa;
  }

  res.emprestimo.status = 'Finalizado';

  try {
    await res.emprestimo.save();

    // Devolve unidade ao estoque
    await Livro.findByIdAndUpdate(res.emprestimo.id_livro, {
      $inc: { quantidade_disponivel: 1 }
    });

    res.json({
      message: 'Devolução registrada com sucesso!',
      emprestimo: res.emprestimo,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE /api/emprestimos/:id
router.delete('/:id', autenticarApiKey, getEmprestimo, async (req, res) => {
  try {
    await res.emprestimo.deleteOne();
    res.json({ message: 'Empréstimo excluído com sucesso!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

async function getEmprestimo(req, res, next) {
  try {
    const emprestimo = await Emprestimo.findById(req.params.id)
      .populate('id_usuario', 'nome email tipo_usuario')
      .populate('id_livro', 'titulo isbn');
    if (!emprestimo) return res.status(404).json({ message: 'Empréstimo não encontrado' });
    res.emprestimo = emprestimo;
    next();
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

module.exports = router;

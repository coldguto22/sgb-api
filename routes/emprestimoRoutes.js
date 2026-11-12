const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Emprestimo = require('../models/emprestimo');
const Livro = require('../models/livro');
const Usuario = require('../models/usuario');
const LogOperacao = require('../models/logOperacao');
const { autenticarUsuario, exigirPapeis } = require('../middleware/auth');
const { criarNotificacao } = require('../services/notificacaoService');

const MULTA_DIARIA = parseFloat(process.env.MULTA_DIARIA || '2.00');
const MULTA_MAXIMA = parseFloat(process.env.MULTA_MAXIMA || '50.00');
const PRAZO_ALUNO = parseInt(process.env.PRAZO_ALUNO || '7');
const PRAZO_PROFESSOR = parseInt(process.env.PRAZO_PROFESSOR || '14');
const LIMITE_ALUNO = parseInt(process.env.LIMITE_ALUNO || '3');
const LIMITE_PROFESSOR = parseInt(process.env.LIMITE_PROFESSOR || '5');

// GET /api/emprestimos
router.get('/', autenticarUsuario, exigirPapeis('Bibliotecario'), async (req, res) => {
  try {
    const emprestimos = await Emprestimo.find()
      .populate('id_usuario', 'nome email tipo_usuario')
      .populate('id_livro', 'titulo isbn');
    res.json(emprestimos.map(resumoEmprestimoOperacional));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/emprestimos/atrasados — Empréstimos com status Atrasado
router.get('/meus', autenticarUsuario, async (req, res) => {
  try {
    const emprestimos = await Emprestimo.find({ id_usuario: req.auth.userId })
      .populate('id_livro', 'titulo isbn');
    res.json(emprestimos.map(resumoEmprestimoDoTitular));
  } catch (err) {
    res.status(500).json({ message: 'Não foi possível consultar os empréstimos.' });
  }
});

function resumoEmprestimoDoTitular(emprestimo) {
  const prevista = new Date(emprestimo.data_prevista_devolucao);
  const estaEmAtraso = emprestimo.status !== 'Finalizado' && prevista < new Date();
  const diasAtraso = estaEmAtraso
    ? Math.ceil((Date.now() - prevista.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const multaCalculada = estaEmAtraso
    ? Math.min(diasAtraso * MULTA_DIARIA, MULTA_MAXIMA)
    : emprestimo.valor_multa || 0;
  const livro = emprestimo.id_livro || {};

  return {
    _id: emprestimo._id,
    id_livro: { _id: livro._id, titulo: livro.titulo, isbn: livro.isbn },
    data_prevista_devolucao: emprestimo.data_prevista_devolucao,
    status: estaEmAtraso ? 'Atrasado' : emprestimo.status,
    valor_multa: multaCalculada,
  };
}

router.get('/atrasados', autenticarUsuario, exigirPapeis('Bibliotecario'), async (req, res) => {
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
router.get('/:id', autenticarUsuario, getEmprestimo, podeAcessarEmprestimo, (req, res) => {
  res.json(res.emprestimo);
});

// POST /api/emprestimos — Realiza novo empréstimo (RF06)
router.post('/', autenticarUsuario, exigirPapeis('Bibliotecario'), async (req, res) => {
  if (!saoObjectIdsValidos(req.body.id_usuario, req.body.id_livro)) {
    return res.status(400).json({ message: 'Usuário ou livro inválido.' });
  }

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

    // RE01: prazo conforme tipo de usuário
    const prazoDias = usuario.tipo_usuario === 'Professor' ? PRAZO_PROFESSOR : PRAZO_ALUNO;
    const dataPrevista = new Date();
    dataPrevista.setDate(dataPrevista.getDate() + prazoDias);

    // RE04: reserva uma unidade no próprio banco. Duas solicitações concorrentes
    // não conseguem reduzir a disponibilidade abaixo de zero.
    const livro = await Livro.findOneAndUpdate(
      { _id: req.body.id_livro, quantidade_disponivel: { $gt: 0 } },
      { $inc: { quantidade_disponivel: -1 } },
      { new: true },
    );
    if (!livro) return res.status(400).json({ message: 'Livro indisponível para empréstimo.' });

    const emprestimo = new Emprestimo({
      id_usuario:              usuario._id,
      id_livro:                livro._id,
      data_prevista_devolucao: dataPrevista,
    });

    try {
      await emprestimo.save();
    } catch (error) {
      // Compensa a reserva se a criação não puder ser persistida.
      await Livro.findByIdAndUpdate(livro._id, { $inc: { quantidade_disponivel: 1 } });
      throw error;
    }

    await registrarEvento(req, 'EMPRESTIMO', emprestimo._id);
    await criarNotificacao({
      idUsuario: usuario._id,
      titulo: 'Empréstimo registrado',
      mensagem: `O empréstimo de "${livro.titulo}" foi registrado.`,
      tipo: 'Emprestimo',
    });

    res.status(201).json(resumoEmprestimoOperacional({
      ...emprestimo.toObject(),
      id_usuario: usuario,
      id_livro: livro,
    }));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT /api/emprestimos/:id/devolver — Registra devolução (RF07 + RF08)
router.put('/:id/devolver', autenticarUsuario, exigirPapeis('Bibliotecario'), getEmprestimo, async (req, res) => {
  if (res.emprestimo.status === 'Finalizado')
    return res.status(400).json({ message: 'Este empréstimo já foi finalizado.' });

  const hoje = new Date();
  // RM01/RM02: cálculo de multa
  const prevista = new Date(res.emprestimo.data_prevista_devolucao);
  if (hoje > prevista) {
    const diasAtraso = Math.ceil((hoje - prevista) / (1000 * 60 * 60 * 24));
    const multa = Math.min(diasAtraso * MULTA_DIARIA, MULTA_MAXIMA);
    res.emprestimo.valor_multa = multa;
  }

  try {
    const devolvido = await Emprestimo.findOneAndUpdate(
      { _id: res.emprestimo._id, status: { $ne: 'Finalizado' } },
      {
        $set: {
          data_devolucao_efetiva: hoje,
          status: 'Finalizado',
          valor_multa: res.emprestimo.valor_multa,
        },
      },
      { new: true },
    );
    if (!devolvido) return res.status(409).json({ message: 'Este empréstimo já foi finalizado.' });

    // Incrementa o estoque somente quando a devolução foi efetivada.
    await Livro.findByIdAndUpdate(res.emprestimo.id_livro, {
      $inc: { quantidade_disponivel: 1 }
    });
    await registrarEvento(req, 'DEVOLUCAO', devolvido._id);
    const idUsuario = res.emprestimo.id_usuario?._id || res.emprestimo.id_usuario;
    const tituloLivro = res.emprestimo.id_livro?.titulo || 'o livro';
    await criarNotificacao({
      idUsuario,
      titulo: 'Devolução registrada',
      mensagem: `A devolução de "${tituloLivro}" foi registrada.`,
      tipo: 'Emprestimo',
    });

    res.json({
      message: 'Devolução registrada com sucesso!',
      emprestimo: resumoEmprestimoOperacional({
        ...devolvido.toObject(),
        id_usuario: res.emprestimo.id_usuario,
        id_livro: res.emprestimo.id_livro,
      }),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function saoObjectIdsValidos(...ids) {
  return ids.every((id) => typeof id === 'string' && mongoose.Types.ObjectId.isValid(id));
}

function resumoEmprestimoOperacional(emprestimo) {
  const usuario = emprestimo.id_usuario || {};
  const livro = emprestimo.id_livro || {};
  return {
    _id: emprestimo._id,
    data_emprestimo: emprestimo.data_emprestimo,
    data_prevista_devolucao: emprestimo.data_prevista_devolucao,
    data_devolucao_efetiva: emprestimo.data_devolucao_efetiva || null,
    status: emprestimo.status,
    valor_multa: emprestimo.valor_multa || 0,
    usuario: {
      _id: usuario._id,
      nome: usuario.nome,
      tipo_usuario: usuario.tipo_usuario,
    },
    livro: {
      _id: livro._id,
      titulo: livro.titulo,
      isbn: livro.isbn,
    },
  };
}

async function registrarEvento(req, operacao, registroId) {
  try {
    await LogOperacao.create({
      id_usuario: req.auth.userId,
      operacao,
      tabela_afetada: 'emprestimos',
      registro_id: registroId.toString(),
      ip_usuario: req.ip || '0.0.0.0',
      user_agent: req.headers['user-agent'],
    });
  } catch (_) {
    // Auditoria não deve desfazer uma operação de circulação já persistida.
  }
}

// DELETE /api/emprestimos/:id
router.delete('/:id', autenticarUsuario, exigirPapeis('Bibliotecario'), getEmprestimo, async (req, res) => {
  try {
    await res.emprestimo.deleteOne();
    res.json({ message: 'Empréstimo excluído com sucesso!' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

function podeAcessarEmprestimo(req, res, next) {
  const titularId = res.emprestimo.id_usuario?._id || res.emprestimo.id_usuario;
  if (req.auth.role === 'Bibliotecario' || titularId?.toString() === req.auth.userId) return next();
  return res.status(403).json({ message: 'Acesso não autorizado.' });
}

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

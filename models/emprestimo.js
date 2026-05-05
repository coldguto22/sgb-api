const mongoose = require('mongoose');

const emprestimoSchema = new mongoose.Schema({
  data_emprestimo: {
    type: Date,
    default: Date.now,
  },
  data_prevista_devolucao: {
    type: Date,
    required: true,
  },
  data_devolucao_efetiva: {
    type: Date,
    default: null,
  },
  status: {
    type: String,
    enum: ['Ativo', 'Finalizado', 'Atrasado'],
    default: 'Ativo',
  },
  valor_multa: {
    type: Number,
    default: 0.00,
    min: 0,
  },
  id_usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
  },
  id_livro: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Livro',
    required: true,
  },
}, { timestamps: true });

const Emprestimo = mongoose.model('Emprestimo', emprestimoSchema);
module.exports = Emprestimo;

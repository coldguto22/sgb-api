const mongoose = require('mongoose');

const logOperacaoSchema = new mongoose.Schema({
  id_usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    default: null,
  },
  operacao: {
    type: String,
    required: true,
    enum: [
      'LOGIN_SUCESSO', 'LOGIN_FALHA', 'MFA_VERIFICADO',
      'CADASTRO_USUARIO', 'ATUALIZACAO_USUARIO', 'EXCLUSAO_USUARIO',
      'CADASTRO_LIVRO', 'ATUALIZACAO_LIVRO', 'EXCLUSAO_LIVRO',
      'EMPRESTIMO', 'DEVOLUCAO', 'MULTA',
      'CADASTRO_CATEGORIA', 'CADASTRO_AUTOR',
      'CADASTRO_UNIDADE', 'CADASTRO_ESTANTE'
    ],
    maxlength: 50,
  },
  tabela_afetada: {
    type: String,
    default: null,
    maxlength: 50,
  },
  registro_id: {
    type: String,
    default: null,
  },
  dados_anteriores: {
    type: String,
    default: null,
  },
  dados_novos: {
    type: String,
    default: null,
  },
  ip_usuario: {
    type: String,
    required: true,
    maxlength: 45,
  },
  user_agent: {
    type: String,
    default: null,
    maxlength: 255,
  },
  data_hora: {
    type: Date,
    default: Date.now,
  },
});

// Logs são imutáveis — sem timestamps automáticos de update
const LogOperacao = mongoose.model('LogOperacao', logOperacaoSchema);
module.exports = LogOperacao;

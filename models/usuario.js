const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const usuarioSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  cpf: {
    type: String,
    required: true,
    unique: true,
    match: /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  senha: {
    type: String,
    required: true,
    minlength: 6,
  },
  password_reset_token_hash: {
    type: String,
    default: null,
    select: false,
    index: true,
  },
  password_reset_expires_at: {
    type: Date,
    default: null,
    select: false,
  },
  telefone: {
    type: String,
    default: null,
    maxlength: 15,
  },
  tipo_usuario: {
    type: String,
    enum: ['Aluno', 'Professor', 'Comunidade', 'Bibliotecario'],
    default: 'Aluno',
  },
  mfa_secret: {
    type: String,
    default: null,
  },
  mfa_ativado: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['Ativo', 'Bloqueado'],
    default: 'Ativo',
  },
  data_cadastro: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Hash da senha antes de salvar
usuarioSchema.pre('save', async function (next) {
  if (!this.isModified('senha')) return next();
  this.senha = await bcrypt.hash(this.senha, 10);
  next();
});

// Ocultar senha e mfa_secret nas respostas
usuarioSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.senha;
  delete obj.mfa_secret;
  delete obj.password_reset_token_hash;
  delete obj.password_reset_expires_at;
  return obj;
};

const Usuario = mongoose.model('Usuario', usuarioSchema);
module.exports = Usuario;

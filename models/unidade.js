const mongoose = require('mongoose');

const unidadeSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  endereco: {
    type: String,
    required: true,
    maxlength: 255,
  },
  cidade: {
    type: String,
    required: true,
    maxlength: 100,
  },
  uf: {
    type: String,
    required: true,
    uppercase: true,
    minlength: 2,
    maxlength: 2,
  },
  cep: {
    type: String,
    default: null,
    maxlength: 10,
  },
  latitude: {
    type: Number,
    default: null,
  },
  longitude: {
    type: Number,
    default: null,
  },
  telefone: {
    type: String,
    default: null,
    maxlength: 20,
  },
  horario_funcionamento: {
    type: String,
    default: null,
    maxlength: 200,
  },
  status: {
    type: String,
    enum: ['Ativa', 'Inativa'],
    default: 'Ativa',
  },
}, { timestamps: true });

const Unidade = mongoose.model('Unidade', unidadeSchema);
module.exports = Unidade;

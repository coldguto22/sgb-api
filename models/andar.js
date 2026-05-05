const mongoose = require('mongoose');

const andarSchema = new mongoose.Schema({
  id_unidade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Unidade',
    required: true,
  },
  numero_andar: {
    type: Number,
    required: true,
  },
  nome_andar: {
    type: String,
    default: null,
    maxlength: 50,
  },
  descricao: {
    type: String,
    default: null,
  },
}, { timestamps: true });

const Andar = mongoose.model('Andar', andarSchema);
module.exports = Andar;

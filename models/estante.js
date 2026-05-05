const mongoose = require('mongoose');

const estanteSchema = new mongoose.Schema({
  id_andar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Andar',
    required: true,
  },
  codigo_estante: {
    type: String,
    required: true,
    trim: true,
    maxlength: 20,
  },
  descricao: {
    type: String,
    default: null,
    maxlength: 200,
  },
  coordenada_x: {
    type: Number,
    default: null,
  },
  coordenada_y: {
    type: Number,
    default: null,
  },
  largura: {
    type: Number,
    default: 80,
  },
  altura: {
    type: Number,
    default: 40,
  },
  tipo: {
    type: String,
    enum: ['Padrão', 'Prateleira Dupla', 'Prateleira Especial'],
    default: 'Padrão',
  },
}, { timestamps: true });

const Estante = mongoose.model('Estante', estanteSchema);
module.exports = Estante;

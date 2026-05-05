const mongoose = require('mongoose');

const categoriaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    maxlength: 50,
  },
  descricao: {
    type: String,
    default: null,
  },
}, { timestamps: true });

const Categoria = mongoose.model('Categoria', categoriaSchema);
module.exports = Categoria;

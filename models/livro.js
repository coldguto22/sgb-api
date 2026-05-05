const mongoose = require('mongoose');

const livroSchema = new mongoose.Schema({
  titulo: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200,
  },
  isbn: {
    type: String,
    unique: true,
    sparse: true,
    maxlength: 13,
  },
  ano_publicacao: {
    type: Number,
    min: 1000,
    max: new Date().getFullYear(),
  },
  editora: {
    type: String,
    default: null,
    maxlength: 100,
  },
  quantidade_total: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
  quantidade_disponivel: {
    type: Number,
    required: true,
    min: 0,
    default: 1,
  },
  id_categoria: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Categoria',
    default: null,
  },
  autores: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Autor',
  }],
  estantes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Estante',
  }],
}, { timestamps: true });

const Livro = mongoose.model('Livro', livroSchema);
module.exports = Livro;

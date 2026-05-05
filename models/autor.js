const mongoose = require('mongoose');

const autorSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  nacionalidade: {
    type: String,
    default: null,
    maxlength: 50,
  },
}, { timestamps: true });

const Autor = mongoose.model('Autor', autorSchema);
module.exports = Autor;

const mongoose = require('mongoose');
const livroEstanteSchema = new mongoose.Schema({
  livro: { type: mongoose.Schema.Types.ObjectId, ref: 'Livro', required: true },
  estante: { type: mongoose.Schema.Types.ObjectId, ref: 'Estante', required: true }
});
module.exports = mongoose.model('LivroEstante', livroEstanteSchema);
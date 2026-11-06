const mongoose = require('mongoose');

const reservaSchema = new mongoose.Schema({
  id_usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  id_livro: { type: mongoose.Schema.Types.ObjectId, ref: 'Livro', required: true },
  status: { type: String, enum: ['Ativa', 'Cancelada', 'Atendida'], default: 'Ativa' },
}, { timestamps: true });
reservaSchema.index({ id_usuario: 1, id_livro: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'Ativa' } });
module.exports = mongoose.model('Reserva', reservaSchema);

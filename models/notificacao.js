const mongoose = require('mongoose');
const notificacaoSchema = new mongoose.Schema({
  id_usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  titulo: { type: String, required: true, maxlength: 120 },
  mensagem: { type: String, required: true, maxlength: 500 },
  tipo: { type: String, enum: ['Reserva', 'Emprestimo', 'Sistema'], default: 'Sistema' },
  lida_em: { type: Date, default: null },
}, { timestamps: true });
module.exports = mongoose.model('Notificacao', notificacaoSchema);

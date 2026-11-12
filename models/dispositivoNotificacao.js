const mongoose = require('mongoose');

const dispositivoNotificacaoSchema = new mongoose.Schema({
  id_usuario: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
    required: true,
    index: true,
  },
  instalacao_id: { type: String, required: true, unique: true, maxlength: 2048 },
  plataforma: { type: String, enum: ['android', 'ios'], required: true },
  ultimo_acesso_em: { type: Date, required: true },
}, { timestamps: true });

module.exports = mongoose.model('DispositivoNotificacao', dispositivoNotificacaoSchema);

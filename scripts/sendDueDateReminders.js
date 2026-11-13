require('dotenv').config();

const mongoose = require('mongoose');
const Emprestimo = require('../models/emprestimo');
const { criarNotificacao } = require('../services/notificacaoService');

const TIME_ZONE = process.env.REMINDER_TIME_ZONE || 'America/Sao_Paulo';

function dateRangeInSaoPaulo(daysFromToday) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(new Date()).reduce((result, part) => {
    if (part.type !== 'literal') result[part.type] = Number(part.value);
    return result;
  }, {});
  const start = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + daysFromToday, 3),
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

async function sendRemindersFor(daysFromToday) {
  const { start, end } = dateRangeInSaoPaulo(daysFromToday);
  const loans = await Emprestimo.find({
    status: { $in: ['Ativo', 'Atrasado'] },
    data_prevista_devolucao: { $gte: start, $lt: end },
  }).populate('id_livro', 'titulo');

  const isToday = daysFromToday === 0;
  let sent = 0;
  for (const loan of loans) {
    const title = loan.id_livro?.titulo || 'seu livro';
    const notification = await criarNotificacao({
      idUsuario: loan.id_usuario,
      titulo: isToday
        ? 'Devolução prevista para hoje'
        : 'Devolução prevista para amanhã',
      mensagem: isToday
        ? `Lembrete: devolva "${title}" hoje para evitar multa.`
        : `Lembrete: "${title}" deve ser devolvido amanhã.`,
      tipo: 'Emprestimo',
      chave: `lembrete-devolucao:${loan._id}:${isToday ? 'hoje' : 'amanha'}`,
    });
    if (notification) sent += 1;
  }
  return sent;
}

async function main() {
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI não configurada.');
  }
  await mongoose.connect(process.env.MONGODB_URI);
  const tomorrow = await sendRemindersFor(1);
  const today = await sendRemindersFor(0);
  console.log(`Lembretes enviados: amanhã=${tomorrow}, hoje=${today}.`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Falha ao enviar lembretes:', error.message);
      process.exitCode = 1;
    })
    .finally(async () => mongoose.disconnect());
}

module.exports = { dateRangeInSaoPaulo, sendRemindersFor };

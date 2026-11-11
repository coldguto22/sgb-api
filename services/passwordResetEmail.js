const nodemailer = require('nodemailer');

function createTransport() {
  if (process.env.SMTP_URL) {
    return nodemailer.createTransport(process.env.SMTP_URL, { requireTLS: true });
  }

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !Number.isInteger(port) || port < 1 || port > 65535 || !user || !pass) {
    throw new Error('Configuração SMTP incompleta.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
  });
}

function getResetPageUrl() {
  const value = process.env.PASSWORD_RESET_URL;
  if (!value) throw new Error('PASSWORD_RESET_URL não configurada.');

  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error('PASSWORD_RESET_URL precisa usar HTTPS.');
  }
  return url.toString();
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

async function sendPasswordResetEmail({ recipient, token }) {
  const from = process.env.MAIL_FROM;
  if (!from) throw new Error('MAIL_FROM não configurado.');

  const resetUrl = getResetPageUrl();
  const safeResetUrl = escapeHtml(resetUrl);
  const transporter = createTransport();

  await transporter.sendMail({
    from,
    to: recipient,
    subject: 'Redefinição de senha do SGB',
    text: [
      'Recebemos uma solicitação para redefinir a senha da sua conta SGB.',
      '',
      `Abra esta página para continuar: ${resetUrl}`,
      `Código de redefinição: ${token}`,
      '',
      'O código expira em 30 minutos e só pode ser usado uma vez.',
      'Se você não solicitou a redefinição, ignore esta mensagem.',
    ].join('\n'),
    html: `<p>Recebemos uma solicitação para redefinir a senha da sua conta SGB.</p><p><a href="${safeResetUrl}">Abrir página de redefinição</a></p><p>Código de redefinição: <strong>${token}</strong></p><p>O código expira em 30 minutos e só pode ser usado uma vez.</p><p>Se você não solicitou a redefinição, ignore esta mensagem.</p>`,
  });
}

module.exports = { sendPasswordResetEmail };

const nodemailer = require('nodemailer');

function resetUrl(token) {
  const baseUrl = process.env.PASSWORD_RESET_URL;
  if (!baseUrl) return null;
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:') return null;
    url.searchParams.set('token', token);
    return url.toString();
  } catch (_) {
    return null;
  }
}

async function sendPasswordResetEmail({ to, token }) {
  const url = resetUrl(token);
  if (!process.env.SMTP_URL || !process.env.MAIL_FROM || !url) {
    throw new Error('Password recovery email is not configured');
  }
  const transporter = nodemailer.createTransport(process.env.SMTP_URL);
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: 'Redefinição de senha do SGB',
    text: `Use este link para redefinir sua senha: ${url}`,
  });
}

module.exports = { sendPasswordResetEmail };

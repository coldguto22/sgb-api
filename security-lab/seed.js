const mongoose = require('mongoose');
const Usuario = require('../models/usuario');
const Unidade = require('../models/unidade');

async function main() {
  if (process.env.MONGODB_URI !== 'mongodb://mongo:27017/sgb_security_lab') throw new Error('Banco de laboratório obrigatório');
  await mongoose.connect(process.env.MONGODB_URI);
  await Usuario.create({ nome: 'Usuario de teste', cpf: '900.000.000-02', email: 'security@example.test', senha: 'Senha-sintetica-123', tipo_usuario: 'Aluno', status: 'Ativo' });
  await Unidade.create({ nome: 'Unidade sintetica', endereco: 'Rua de teste', cidade: 'Teste', uf: 'SP', status: 'Ativa' });
  await mongoose.disconnect();
}
main().catch(() => { console.error('Falha ao preparar dados sintéticos'); process.exitCode = 1; });

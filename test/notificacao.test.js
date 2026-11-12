const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';

const app = require('../app');
const Usuario = require('../models/usuario');
const DispositivoNotificacao = require('../models/dispositivoNotificacao');

const USER_ID = '64b000000000000000000001';
const token = jwt.sign(
  { role: 'Aluno', version: 0 },
  process.env.JWT_SECRET,
  { subject: USER_ID, expiresIn: '15m', issuer: 'sgb-api', audience: 'sgb-flutter' },
);

function userQuery() {
  return {
    select: jest.fn().mockResolvedValue({
      _id: USER_ID,
      status: 'Ativo',
      tipo_usuario: 'Aluno',
      token_version: 0,
    }),
  };
}

describe('Dispositivos de notificações', () => {
  beforeEach(() => {
    jest.spyOn(Usuario, 'findById').mockImplementation(() => userQuery());
    jest.spyOn(DispositivoNotificacao, 'findOneAndUpdate').mockResolvedValue({});
    jest.spyOn(DispositivoNotificacao, 'findOneAndDelete').mockResolvedValue(null);
  });

  afterEach(() => jest.restoreAllMocks());

  it('associa uma instalação ao titular autenticado', async () => {
    const response = await request(app)
      .put('/api/notificacoes/dispositivos')
      .set('authorization', `Bearer ${token}`)
      .send({ instalacao_id: 'fid-de-teste-com-tamanho-valido', plataforma: 'android' });

    expect(response.statusCode).toBe(204);
    expect(DispositivoNotificacao.findOneAndUpdate).toHaveBeenCalledWith(
      { instalacao_id: 'fid-de-teste-com-tamanho-valido' },
      expect.objectContaining({
        $set: expect.objectContaining({ id_usuario: USER_ID, plataforma: 'android' }),
      }),
      expect.objectContaining({ upsert: true }),
    );
  });

  it('rejeita instalação inválida sem gravar nada', async () => {
    const response = await request(app)
      .put('/api/notificacoes/dispositivos')
      .set('authorization', `Bearer ${token}`)
      .send({ instalacao_id: 'curto', plataforma: 'android' });

    expect(response.statusCode).toBe(400);
    expect(DispositivoNotificacao.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('remove somente a instalação pertencente ao titular autenticado', async () => {
    const response = await request(app)
      .delete('/api/notificacoes/dispositivos')
      .set('authorization', `Bearer ${token}`)
      .send({ instalacao_id: 'fid-de-teste-com-tamanho-valido' });

    expect(response.statusCode).toBe(204);
    expect(DispositivoNotificacao.findOneAndDelete).toHaveBeenCalledWith({
      id_usuario: USER_ID,
      instalacao_id: 'fid-de-teste-com-tamanho-valido',
    });
  });
});

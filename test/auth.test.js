const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

jest.mock('../services/passwordResetEmail', () => ({
  sendPasswordResetEmail: jest.fn(),
}));

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';

const app = require('../app');
const Usuario = require('../models/usuario');
const { sendPasswordResetEmail } = require('../services/passwordResetEmail');

const tokenSecret = process.env.JWT_SECRET;

function query(result) {
  return { select: jest.fn().mockResolvedValue(result) };
}

describe('Autenticação individual', () => {
  const senha = 'Senha-de-teste-123';
  let usuario;

  beforeEach(async () => {
    usuario = {
      _id: '64b000000000000000000001',
      nome: 'Ana Silva',
      email: 'ana@example.test',
      senha: await bcrypt.hash(senha, 12),
      tipo_usuario: 'Aluno',
      status: 'Ativo',
      token_version: 0,
      save: jest.fn().mockImplementation(async function save() { return this; }),
    };
    sendPasswordResetEmail.mockReset();
  });

  afterEach(() => jest.restoreAllMocks());

  it('emite token curto e não devolve senha no login válido', async () => {
    jest.spyOn(Usuario, 'findOne').mockReturnValue(query(usuario));

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: usuario.email, senha });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      token_type: 'Bearer',
      expires_in: 900,
      user: expect.objectContaining({ id: usuario._id, nome: usuario.nome }),
    }));
    expect(response.body).not.toHaveProperty('senha');

    const payload = jwt.verify(response.body.access_token, tokenSecret, {
      algorithms: ['HS256'],
      issuer: 'sgb-api',
      audience: 'sgb-flutter',
    });
    expect(payload.sub).toBe(usuario._id);
    expect(payload.role).toBe('Aluno');
  });

  it('não diferencia credencial inexistente de senha inválida', async () => {
    jest.spyOn(Usuario, 'findOne').mockReturnValue(query(usuario));

    const response = await request(app)
      .post('/api/auth/login')
      .send({ email: usuario.email, senha: 'senha-incorreta' });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ message: 'Credenciais inválidas.' });
  });

  it('rejeita token que foi revogado pela mudança de versão da sessão', async () => {
    const token = jwt.sign(
      { role: 'Aluno', version: 0 },
      tokenSecret,
      {
        algorithm: 'HS256',
        subject: usuario._id,
        expiresIn: '15m',
        issuer: 'sgb-api',
        audience: 'sgb-flutter',
      },
    );
    jest.spyOn(Usuario, 'findById').mockReturnValue(
      query({ ...usuario, token_version: 1 }),
    );

    const response = await request(app)
      .get('/api/auth/me')
      .set('authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ message: 'Sessão inválida ou expirada.' });
  });

  it('rejeita token expirado antes de consultar os dados do usuário', async () => {
    const tokenExpirado = jwt.sign(
      { role: 'Aluno', version: 0 },
      tokenSecret,
      {
        algorithm: 'HS256',
        subject: usuario._id,
        expiresIn: '-1s',
        issuer: 'sgb-api',
        audience: 'sgb-flutter',
      },
    );
    const findById = jest.spyOn(Usuario, 'findById');

    const response = await request(app)
      .get('/api/auth/me')
      .set('authorization', `Bearer ${tokenExpirado}`);

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({ message: 'Sessão inválida ou expirada.' });
    expect(findById).not.toHaveBeenCalled();
  });

  it('invalida os tokens emitidos no logout', async () => {
    const token = jwt.sign(
      { role: 'Aluno', version: 0 },
      tokenSecret,
      {
        algorithm: 'HS256',
        subject: usuario._id,
        expiresIn: '15m',
        issuer: 'sgb-api',
        audience: 'sgb-flutter',
      },
    );
    jest.spyOn(Usuario, 'findById').mockReturnValue(query(usuario));
    const update = jest.spyOn(Usuario, 'findByIdAndUpdate').mockResolvedValue(usuario);

    const response = await request(app)
      .post('/api/auth/logout')
      .set('authorization', `Bearer ${token}`);

    expect(response.statusCode).toBe(204);
    expect(update).toHaveBeenCalledWith(usuario._id, {
      $inc: { token_version: 1 },
    });
  });

  it('atualiza apenas os campos permitidos do próprio perfil', async () => {
    const token = jwt.sign(
      { role: 'Aluno', version: 0 }, tokenSecret,
      { subject: usuario._id, expiresIn: '15m', issuer: 'sgb-api', audience: 'sgb-flutter' },
    );
    const perfil = {
      ...usuario,
      telefone: null,
      save: jest.fn().mockImplementation(async function save() { return this; }),
    };
    jest.spyOn(Usuario, 'findById').mockReturnValue(query(perfil));

    const response = await request(app)
      .put('/api/auth/me')
      .set('authorization', `Bearer ${token}`)
      .send({ nome: 'Ana Atualizada', telefone: '11999999999', tipo_usuario: 'Bibliotecario' });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({
      id: usuario._id, nome: 'Ana Atualizada', telefone: '11999999999', tipo_usuario: 'Aluno',
    }));
    expect(perfil.save).toHaveBeenCalledTimes(1);
  });

  it('não revela se existe uma conta na solicitação de recuperação', async () => {
    jest.spyOn(Usuario, 'findOne').mockReturnValue(query(null));

    const response = await request(app)
      .post('/api/auth/recuperacao-senha')
      .send({ email: 'inexistente@example.test' });

    expect(response.statusCode).toBe(202);
    expect(response.body).toEqual({
      message: 'Se houver uma conta ativa para este e-mail, enviaremos as instruções de recuperação.',
    });
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('armazena apenas o hash do token e envia o token aleatório por e-mail', async () => {
    jest.spyOn(Usuario, 'findOne').mockReturnValue(query(usuario));
    sendPasswordResetEmail.mockResolvedValue(undefined);

    const response = await request(app)
      .post('/api/auth/recuperacao-senha')
      .send({ email: usuario.email });

    expect(response.statusCode).toBe(202);
    expect(usuario.password_reset_token_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(usuario.password_reset_expires_at).toBeInstanceOf(Date);
    expect(sendPasswordResetEmail).toHaveBeenCalledWith({
      to: usuario.email,
      token: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(usuario.password_reset_token_hash).not.toBe(
      sendPasswordResetEmail.mock.calls[0][0].token,
    );
  });

  it('redefine a senha, remove o token e revoga sessões anteriores', async () => {
    const token = 'a'.repeat(64);
    jest.spyOn(Usuario, 'findOne').mockReturnValue(query(usuario));

    const response = await request(app)
      .post('/api/auth/recuperacao-senha/confirmar')
      .send({ token, senha: 'Nova-senha-segura-123' });

    expect(response.statusCode).toBe(204);
    expect(usuario.senha).toBe('Nova-senha-segura-123');
    expect(usuario.password_reset_token_hash).toBeNull();
    expect(usuario.password_reset_expires_at).toBeNull();
    expect(usuario.token_version).toBe(1);
  });
});

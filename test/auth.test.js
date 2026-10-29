const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-with-at-least-32-characters';

const app = require('../app');
const Usuario = require('../models/usuario');

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
    };
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
});

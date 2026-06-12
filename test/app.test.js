const request = require('supertest');
process.env.NODE_ENV = 'test';
const API_KEY = 'chave_super_secreta_32_bytes';
process.env.API_KEY_SECRET = API_KEY;

const app = require('../app');
const Categoria = require('../models/categoria');
const Autor = require('../models/autor');
const Usuario = require('../models/usuario');
const Livro = require('../models/livro');
const Unidade = require('../models/unidade');
const Emprestimo = require('../models/emprestimo');
const LogOperacao = require('../models/logOperacao');

function createMockQuery(result) {
  const query = Promise.resolve(result);
  query.populate = jest.fn(() => query);
  query.sort = jest.fn(() => query);
  return query;
}

describe('SGB API - Testes de Rotas', () => {
  const spies = [];

  beforeAll(() => {
    spies.push(jest.spyOn(Categoria, 'find').mockResolvedValue([]));
    spies.push(jest.spyOn(Categoria, 'findById').mockResolvedValue(null));
    spies.push(jest.spyOn(Autor, 'find').mockResolvedValue([]));
    spies.push(jest.spyOn(Usuario, 'find').mockResolvedValue([]));
    spies.push(jest.spyOn(Usuario, 'findById').mockResolvedValue(null));
    spies.push(jest.spyOn(Livro, 'find').mockImplementation(() => createMockQuery([])));
    spies.push(jest.spyOn(Unidade, 'find').mockResolvedValue([]));
    spies.push(jest.spyOn(Emprestimo, 'find').mockImplementation(() => createMockQuery([])));
    spies.push(jest.spyOn(Emprestimo, 'updateMany').mockResolvedValue({ acknowledged: true }));
    spies.push(jest.spyOn(LogOperacao, 'find').mockImplementation(() => createMockQuery([])));
  });

  afterAll(() => {
    spies.forEach((spy) => spy.mockRestore());
  });

  // ── Rota raiz ──────────────────────────────────────────
  describe('GET /', () => {
    it('Deve retornar informações do sistema (GET /)', async () => {
      const response = await request(app).get('/');
      expect(response.statusCode).toEqual(200);
      expect(response.body).toHaveProperty('sistema');
      expect(response.body.sistema).toContain('SGB');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body.endpoints).toBeInstanceOf(Array);
    });
  });

  // ── Autenticação ───────────────────────────────────────
  describe('Autenticação via API Key', () => {
    it('Deve rejeitar requisição sem API Key (GET /api/categorias)', async () => {
      const response = await request(app).get('/api/categorias');
      expect(response.statusCode).toEqual(401);
      expect(response.body).toHaveProperty('message');
    });

    it('Deve rejeitar requisição com API Key inválida', async () => {
      const response = await request(app)
        .get('/api/categorias')
        .set('x-api-key', 'chave-errada');
      expect(response.statusCode).toEqual(401);
    });
  });

  // ── Rota não encontrada ────────────────────────────────
  describe('Rota inexistente', () => {
    it('Deve retornar 404 para rota inexistente', async () => {
      const response = await request(app).get('/rota-inexistente');
      expect(response.statusCode).toEqual(404);
      expect(response.body).toHaveProperty('message');
    });
  });

  // ── Categorias ─────────────────────────────────────────
  describe('Categorias (GET /api/categorias)', () => {
    it('Deve listar categorias com API Key válida', async () => {
      const response = await request(app)
        .get('/api/categorias')
        .set('x-api-key', API_KEY);
      expect(response.statusCode).toEqual(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('Deve retornar 404 para categoria inexistente', async () => {
      const response = await request(app)
        .get('/api/categorias/000000000000000000000000')
        .set('x-api-key', API_KEY);
      expect(response.statusCode).toEqual(404);
      expect(response.body).toHaveProperty('message');
    });

    it('Deve retornar erro ao criar categoria sem nome (POST /api/categorias)', async () => {
      const response = await request(app)
        .post('/api/categorias')
        .set('x-api-key', API_KEY)
        .send({ descricao: 'Sem nome' });
      expect(response.statusCode).toEqual(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  // ── Autores ────────────────────────────────────────────
  describe('Autores (GET /api/autores)', () => {
    it('Deve listar autores com API Key válida', async () => {
      const response = await request(app)
        .get('/api/autores')
        .set('x-api-key', API_KEY);
      expect(response.statusCode).toEqual(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('Deve retornar erro ao criar autor sem nome', async () => {
      const response = await request(app)
        .post('/api/autores')
        .set('x-api-key', API_KEY)
        .send({ nacionalidade: 'Brasileira' });
      expect(response.statusCode).toEqual(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  // ── Usuários ───────────────────────────────────────────
  describe('Usuários (POST /api/usuarios)', () => {
    it('Deve retornar erro ao criar usuário com dados inválidos', async () => {
      const response = await request(app)
        .post('/api/usuarios')
        .set('x-api-key', API_KEY)
        .send({ nome: 'Sem CPF e Email' });
      expect(response.statusCode).toEqual(400);
      expect(response.body).toHaveProperty('message');
    });

    it('Deve listar usuários com API Key válida', async () => {
      const response = await request(app)
        .get('/api/usuarios')
        .set('x-api-key', API_KEY);
      expect(response.statusCode).toEqual(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  // ── Livros ─────────────────────────────────────────────
  describe('Livros', () => {
    it('Deve listar livros disponíveis (GET /api/livros/disponiveis)', async () => {
      const response = await request(app)
        .get('/api/livros/disponiveis')
        .set('x-api-key', API_KEY);
      expect(response.statusCode).toEqual(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('Deve buscar livros por termo (GET /api/livros/buscar?q=dom)', async () => {
      const response = await request(app)
        .get('/api/livros/buscar?q=dom')
        .set('x-api-key', API_KEY);
      expect(response.statusCode).toEqual(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('Deve retornar erro na busca sem parâmetro "q"', async () => {
      const response = await request(app)
        .get('/api/livros/buscar')
        .set('x-api-key', API_KEY);
      expect(response.statusCode).toEqual(400);
      expect(response.body).toHaveProperty('message');
    });

    it('Deve retornar erro ao criar livro sem título', async () => {
      const response = await request(app)
        .post('/api/livros')
        .set('x-api-key', API_KEY)
        .send({ editora: 'Sem título' });
      expect(response.statusCode).toEqual(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  // ── Unidades (endpoint público) ────────────────────────
  describe('Unidades (público)', () => {
    it('Deve listar unidades ativas sem API Key', async () => {
      const response = await request(app).get('/api/unidades');
      expect(response.statusCode).toEqual(200);
      expect(response.body).toBeInstanceOf(Array);
    });
  });

  // ── Empréstimos ────────────────────────────────────────
  describe('Empréstimos', () => {
    it('Deve listar empréstimos com API Key válida', async () => {
      const response = await request(app)
        .get('/api/emprestimos')
        .set('x-api-key', API_KEY);
      expect(response.statusCode).toEqual(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('Deve listar empréstimos atrasados', async () => {
      const response = await request(app)
        .get('/api/emprestimos/atrasados')
        .set('x-api-key', API_KEY);
      expect(response.statusCode).toEqual(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('Deve retornar erro ao emprestar livro com ID inválido', async () => {
      const response = await request(app)
        .post('/api/emprestimos')
        .set('x-api-key', API_KEY)
        .send({ id_usuario: '000000000000000000000001', id_livro: '000000000000000000000002' });
      expect(response.statusCode).toBeGreaterThanOrEqual(400);
      expect(response.body).toHaveProperty('message');
    });
  });

  // ── Logs ───────────────────────────────────────────────
  describe('Logs', () => {
    it('Deve listar logs com API Key válida', async () => {
      const response = await request(app)
        .get('/api/logs')
        .set('x-api-key', API_KEY);
      expect(response.statusCode).toEqual(200);
      expect(response.body).toBeInstanceOf(Array);
    });

    it('Deve retornar erro ao criar log sem operação', async () => {
      const response = await request(app)
        .post('/api/logs')
        .set('x-api-key', API_KEY)
        .send({ id_usuario: null });
      expect(response.statusCode).toEqual(400);
      expect(response.body).toHaveProperty('message');
    });
  });

});

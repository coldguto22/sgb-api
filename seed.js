require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Models (certifique-se de que os arquivos existem)
const Categoria = require('./models/categoria');
const Autor = require('./models/autor');
const Livro = require('./models/livro');
const Usuario = require('./models/usuario');
const Unidade = require('./models/unidade');
const Andar = require('./models/andar');
const Estante = require('./models/estante');
const LivroEstante = require('./models/livro_estante'); // se não existir, crie (ver observação)
const Emprestimo = require('./models/emprestimo');
const LogOperacao = require('./models/logOperacao');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI não definida no .env');
  process.exit(1);
}

const seedData = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // Limpar coleções (opcional, mas evita duplicação)
    await Promise.all([
      Categoria.deleteMany({}),
      Autor.deleteMany({}),
      Livro.deleteMany({}),
      Usuario.deleteMany({}),
      Unidade.deleteMany({}),
      Andar.deleteMany({}),
      Estante.deleteMany({}),
      LivroEstante.deleteMany({}),
      Emprestimo.deleteMany({}),
      LogOperacao.deleteMany({})
    ]);
    console.log('🧹 Coleções limpas');

    // 1. Categorias
    const categorias = await Categoria.insertMany([
      { nome: 'Ficção', descricao: 'Livros de ficção literária' },
      { nome: 'Não-Ficção', descricao: 'Livros baseados em fatos reais' },
      { nome: 'Ciência', descricao: 'Livros científicos e acadêmicos' },
      { nome: 'Tecnologia', descricao: 'Livros sobre tecnologia e programação' }
    ]);
    console.log(`📚 ${categorias.length} categorias inseridas`);

    // 2. Autores
    const autores = await Autor.insertMany([
      { nome: 'Machado de Assis', nacionalidade: 'Brasileira' },
      { nome: 'J.K. Rowling', nacionalidade: 'Britânica' },
      { nome: 'George Orwell', nacionalidade: 'Britânica' }
    ]);
    console.log(`✍️ ${autores.length} autores inseridos`);

    // 3. Livros (referencia categoria e autores via populate)
    const livrosData = [
      { titulo: 'Dom Casmurro', isbn: '9788535900956', ano_publicacao: 1899, editora: 'Companhia das Letras', quantidade_total: 3, quantidade_disponivel: 3, categoria: categorias[0]._id, autores: [autores[0]._id] },
      { titulo: 'Harry Potter e a Pedra Filosofal', isbn: '9788532511010', ano_publicacao: 1997, editora: 'Rocco', quantidade_total: 5, quantidade_disponivel: 4, categoria: categorias[0]._id, autores: [autores[1]._id] },
      { titulo: '1984', isbn: '9788535906781', ano_publicacao: 1949, editora: 'Companhia das Letras', quantidade_total: 2, quantidade_disponivel: 2, categoria: categorias[0]._id, autores: [autores[2]._id] }
    ];
    const livros = await Livro.insertMany(livrosData);
    console.log(`📖 ${livros.length} livros inseridos`);

    // 4. Usuários (senha hash fixa para "123456" - só exemplo)
    const hashSenha = await bcrypt.hash('123456', 10);
    const usuarios = await Usuario.insertMany([
      { nome: 'Admin Sistema', cpf: '000.000.000-00', email: 'admin@biblioteca.com', senha: hashSenha, telefone: '11999999999', tipo_usuario: 'Bibliotecario', status: 'Ativo', mfa_ativado: false },
      { nome: 'Ana Silva', cpf: '123.456.789-00', email: 'ana.silva@email.com', senha: hashSenha, telefone: '11912345678', tipo_usuario: 'Aluno', status: 'Ativo' },
      { nome: 'Carlos Santos', cpf: '987.654.321-00', email: 'carlos.santos@email.com', senha: hashSenha, telefone: '11987654321', tipo_usuario: 'Professor', status: 'Ativo' }
    ]);
    console.log(`👥 ${usuarios.length} usuários inseridos`);

    // 5. Unidades
    const unidades = await Unidade.insertMany([
      { nome: 'Biblioteca Central - Campus Mauá', endereco: 'Rua Rio Branco, 123', cidade: 'Mauá', uf: 'SP', cep: '09310-000', latitude: -23.6685, longitude: -46.4615, telefone: '1141234567', status: 'Ativa' },
      { nome: 'Biblioteca Setorial - Campus São Paulo', endereco: 'Av. Paulista, 1000', cidade: 'São Paulo', uf: 'SP', cep: '01310-100', latitude: -23.5615, longitude: -46.6561, telefone: '1134567890', status: 'Ativa' },
      { nome: 'Biblioteca Digital - Campus Santo André', endereco: 'Rua das Flores, 456', cidade: 'Santo André', uf: 'SP', cep: '09080-000', latitude: -23.6636, longitude: -46.5383, telefone: '1156781234', status: 'Ativa' }
    ]);
    console.log(`🏛️ ${unidades.length} unidades inseridas`);

    // 6. Andares
    const andares = await Andar.insertMany([
    { id_unidade: unidades[0]._id, numero_andar: 0, nome_andar: 'Térreo - Recepção e Periódicos', descricao: 'Recepção e periódicos' },
    { id_unidade: unidades[0]._id, numero_andar: 1, nome_andar: '1º Andar - Ficção e Literatura', descricao: 'Ficção e literatura' },
    { id_unidade: unidades[0]._id, numero_andar: 2, nome_andar: '2º Andar - Não-Ficção e Ciências', descricao: 'Não-ficção e ciências' }
    ]);
    console.log(`🗄️ ${andares.length} andares inseridos`);

    // 7. Estantes
    const estantes = await Estante.insertMany([
    { id_andar: andares[1]._id, codigo_estante: 'E-01', descricao: 'Ficção Brasileira (A-C)', coordenada_x: 100, coordenada_y: 50, largura: 80, altura: 40 },
    { id_andar: andares[1]._id, codigo_estante: 'E-02', descricao: 'Ficção Brasileira (D-F)', coordenada_x: 200, coordenada_y: 50 },
    { id_andar: andares[1]._id, codigo_estante: 'E-03', descricao: 'Ficção Brasileira (G-L)', coordenada_x: 300, coordenada_y: 50 },
    { id_andar: andares[2]._id, codigo_estante: 'E-05', descricao: 'Ciências Exatas', coordenada_x: 100, coordenada_y: 80 },
    { id_andar: andares[2]._id, codigo_estante: 'E-06', descricao: 'Ciências Humanas', coordenada_x: 250, coordenada_y: 80 }
    ]);
    console.log(`📚 ${estantes.length} estantes inseridas`);

    // 8. Relação Livro ↔ Estante (usando o modelo LivroEstante, se existir; senão, pode ser uma collection separada)
    // Vamos associar manualmente: Dom Casmurro (livros[0]) na estante E-01 (estantes[0]), Harry Potter (livros[1]) na E-03 (estantes[2]), 1984 (livros[2]) na E-02 (estantes[1])
    await LivroEstante.insertMany([
    { livro: livros[0]._id, estante: estantes[0]._id }, // Dom Casmurro -> E-01
    { livro: livros[1]._id, estante: estantes[2]._id }, // Harry Potter -> E-03
    { livro: livros[2]._id, estante: estantes[1]._id }  // 1984 -> E-02
    ]);
    console.log(`🔗 Relações livro-estante criadas`);

    console.log('\n🎉 Seed concluído com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante seed:', error);
    process.exit(1);
  }
};

seedData();
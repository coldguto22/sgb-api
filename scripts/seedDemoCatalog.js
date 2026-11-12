require('dotenv').config();
const mongoose = require('mongoose');

const Categoria = require('../models/categoria');
const Autor = require('../models/autor');
const Livro = require('../models/livro');
const Usuario = require('../models/usuario');

const required = [
  'MONGODB_URI',
  'DEMO_BIBLIOTECARIO_PASSWORD',
  'DEMO_ALUNO_PASSWORD',
  'DEMO_PROFESSOR_PASSWORD',
];

for (const name of required) {
  if (!process.env[name]) {
    throw new Error(`${name} precisa ser definida para executar esta carga.`);
  }
}

const passwordVariables = required.slice(1);
for (const name of passwordVariables) {
  if (process.env[name].length < 12) {
    throw new Error(`${name} precisa ter ao menos 12 caracteres.`);
  }
}

// Obras em formato de livro, sem repetir reedições. O critério e as fontes
// estão documentados em docs/seed-demo-catalog.md.
const tolkienBooks = [
  ['O Hobbit', 1937],
  ['A Sociedade do Anel', 1954],
  ['As Duas Torres', 1954],
  ['O Retorno do Rei', 1955],
  ['As Aventuras de Tom Bombadil', 1962],
  ['The Road Goes Ever On', 1967],
  ['O Silmarillion', 1977],
  ['Contos Inacabados', 1980],
  ['O Livro dos Contos Perdidos, Parte I', 1983],
  ['O Livro dos Contos Perdidos, Parte II', 1984],
  ['Os Laios de Beleriand', 1985],
  ['A Formação da Terra-média', 1986],
  ['O Caminho Perdido e Outros Escritos', 1987],
  ['O Retorno da Sombra', 1988],
  ['A Traição de Isengard', 1989],
  ['A Guerra do Anel', 1990],
  ['Sauron Derrotado', 1992],
  ['O Anel de Morgoth', 1993],
  ['A Guerra das Joias', 1994],
  ['Os Povos da Terra-média', 1996],
  ['Roverandom', 1998],
  ['Sr. Bliss', 1982],
  ['Cartas do Papai Noel', 1976],
  ['O Fazendeiro Giles de Ham', 1949],
  ['Folha por Niggle', 1945],
  ['Ferreiro de Bosque Grande', 1967],
  ['Os Filhos de Húrin', 2007],
  ['A Lenda de Sigurd e Gudrún', 2009],
  ['A Queda de Artur', 2013],
  ['Beowulf: Tradução e Comentário', 2014],
  ['A História de Kullervo', 2015],
  ['Beren e Lúthien', 2017],
  ['A Queda de Gondolin', 2018],
  ['A Natureza da Terra-média', 2021],
  ['A Queda de Númenor', 2022],
  ['Sir Gawain e o Cavaleiro Verde, Pearl e Sir Orfeo', 1975],
  ['Os Monstros e os Críticos e Outros Ensaios', 1983],
  ['As Cartas de J.R.R. Tolkien', 1981],
  ['O Retorno de Beorhtnoth, Filho de Beorhthelm', 1953],
];

const demoUsers = [
  {
    nome: 'Bibliotecária Demonstração',
    cpf: '900.000.000-01',
    email: 'bibliotecaria.demo@sgb.local',
    telefone: '11900000001',
    tipo_usuario: 'Bibliotecario',
    passwordVariable: 'DEMO_BIBLIOTECARIO_PASSWORD',
  },
  {
    nome: 'Aluno Demonstração',
    cpf: '900.000.000-02',
    email: 'aluno.demo@sgb.local',
    telefone: '11900000002',
    tipo_usuario: 'Aluno',
    passwordVariable: 'DEMO_ALUNO_PASSWORD',
  },
  {
    nome: 'Professor Demonstração',
    cpf: '900.000.000-03',
    email: 'professor.demo@sgb.local',
    telefone: '11900000003',
    tipo_usuario: 'Professor',
    passwordVariable: 'DEMO_PROFESSOR_PASSWORD',
  },
];

async function upsertUser(user) {
  const existing = await Usuario.findOne({ email: user.email }).select('+senha');
  if (existing) return false;

  await Usuario.create({
    nome: user.nome,
    cpf: user.cpf,
    email: user.email,
    telefone: user.telefone,
    tipo_usuario: user.tipo_usuario,
    senha: process.env[user.passwordVariable],
    status: 'Ativo',
    mfa_ativado: false,
  });
  return true;
}

async function seedDemoCatalog() {
  await mongoose.connect(process.env.MONGODB_URI);

  const category = await Categoria.findOneAndUpdate(
    { nome: 'Literatura fantástica' },
    { $setOnInsert: { descricao: 'Fantasia, mitologia e narrativas especulativas.' } },
    { new: true, upsert: true },
  );
  const author = await Autor.findOneAndUpdate(
    { nome: 'J.R.R. Tolkien' },
    { $setOnInsert: { nacionalidade: 'Britânica' } },
    { new: true, upsert: true },
  );

  const operations = tolkienBooks.map(([titulo, ano_publicacao]) => ({
    updateOne: {
      filter: { titulo },
      update: {
        $setOnInsert: {
          titulo,
          ano_publicacao,
          editora: 'Acervo demonstrativo',
          quantidade_total: 2,
          quantidade_disponivel: 2,
          id_categoria: category._id,
          autores: [author._id],
        },
      },
      upsert: true,
    },
  }));
  const catalogResult = await Livro.bulkWrite(operations, { ordered: false });
  const createdUsers = await Promise.all(demoUsers.map(upsertUser));

  console.log(`Catálogo Tolkien: ${tolkienBooks.length} títulos processados; ${catalogResult.upsertedCount} inseridos.`);
  console.log(`Contas de demonstração: ${createdUsers.filter(Boolean).length} criadas; as existentes foram preservadas.`);
}

seedDemoCatalog()
  .catch((error) => {
    console.error('Falha na carga demonstrativa:', error.message);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());

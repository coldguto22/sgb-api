# SGB API 2.0 — Sistema de Gerenciamento de Biblioteca

API RESTful desenvolvida com Node.js, Express e MongoDB Atlas para o projeto SGB da FATEC Mauá.

**Autores:** Jorge Rizzini · Laisa Eugênio · Otávio Lima Beato  
**Disciplina:** Laboratório Web 3 — DSM

---

## 🚀 Como rodar localmente

```bash
# 1. Clone o repositório
git clone https://github.com/SEU_USUARIO/sgb-api.git
cd sgb-api

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com sua URI do MongoDB Atlas e a API Key

# 4. Inicie o servidor
npm start

# 5. Acesse
# http://localhost:3000
```

---

## 🧪 Testes

```bash
npm test
```

Os testes usam **Jest** + **Supertest** e não precisam de conexão com o banco (NODE_ENV=test).

---

## ☁️ Deploy no Render

1. Faça push do código para o GitHub
2. Acesse [render.com](https://render.com) e crie um **New Web Service**
3. Conecte o repositório GitHub
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Node Version:** 18
5. Adicione as **Environment Variables** no painel do Render:

| Variável | Valor |
|---|---|
| `MONGODB_URI` | Sua URI do MongoDB Atlas |
| `API_KEY_SECRET` | Sua chave secreta |
| `MULTA_DIARIA` | 2.00 |
| `MULTA_MAXIMA` | 50.00 |
| `PRAZO_ALUNO` | 7 |
| `PRAZO_PROFESSOR` | 14 |
| `LIMITE_ALUNO` | 3 |
| `LIMITE_PROFESSOR` | 5 |

---

## 📡 Endpoints da API

Autenticação via header `x-api-key: SUA_CHAVE` (exceto rotas públicas marcadas com 🌐).

### 📚 Livros
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/livros` | Lista todos os livros |
| GET | `/api/livros/:id` | Detalhes de um livro |
| GET | `/api/livros/disponiveis` | Livros disponíveis para empréstimo |
| GET | `/api/livros/buscar?q=termo` | Busca por título ou ISBN |
| GET | `/api/livros/categoria/:id` | Livros por categoria |
| GET 🌐 | `/api/livros/localizacao/:id` | Localização física do livro |
| POST | `/api/livros` | Cadastra novo livro |
| PUT | `/api/livros/:id` | Atualiza livro |
| DELETE | `/api/livros/:id` | Remove livro |

### 👤 Usuários
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/usuarios` | Lista todos os usuários |
| GET | `/api/usuarios/:id` | Detalhes de um usuário |
| POST | `/api/usuarios` | Cadastra novo usuário |
| PUT | `/api/usuarios/:id` | Atualiza usuário |
| DELETE | `/api/usuarios/:id` | Remove usuário |

### 📖 Empréstimos
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/emprestimos` | Lista todos os empréstimos |
| GET | `/api/emprestimos/atrasados` | Empréstimos atrasados |
| GET | `/api/emprestimos/:id` | Detalhes de um empréstimo |
| POST | `/api/emprestimos` | Realiza novo empréstimo |
| PUT | `/api/emprestimos/:id/devolver` | Registra devolução (calcula multa) |
| DELETE | `/api/emprestimos/:id` | Remove empréstimo |

### 🏢 Unidades / Mapas
| Método | Endpoint | Descrição |
|---|---|---|
| GET 🌐 | `/api/unidades` | Lista unidades ativas |
| GET 🌐 | `/api/unidades/:id/estantes` | Estantes de uma unidade |
| GET 🌐 | `/api/estantes/:id/livros` | Livros de uma estante |
| POST | `/api/unidades` | Cadastra unidade |
| POST | `/api/andares` | Cadastra andar |
| POST | `/api/estantes` | Cadastra estante |

### 📋 Categorias / Autores
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/categorias` | Lista categorias |
| POST | `/api/categorias` | Cria categoria |
| GET | `/api/autores` | Lista autores |
| POST | `/api/autores` | Cria autor |

### 🔍 Logs (apenas bibliotecários)
| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/api/logs` | Lista logs (filtros: operacao, id_usuario, data_inicio, data_fim) |
| GET | `/api/logs/:id` | Detalhes de um log |
| POST | `/api/logs` | Registra operação |

---

## 🗃️ Regras de Negócio Implementadas

- **RE01** Prazo de empréstimo: 7 dias (Aluno) / 14 dias (Professor)
- **RE02** Limite simultâneo: 3 empréstimos (Aluno) / 5 (Professor)
- **RE03** Usuários com multas pendentes não podem fazer novos empréstimos
- **RE04** Livros indisponíveis não podem ser emprestados
- **RM01** Multa de R$ 2,00 por dia de atraso
- **RM02** Multa máxima de R$ 50,00 por empréstimo
- **RLOG03** Logs são imutáveis (sem PUT/DELETE)
- **RNF01** Senhas criptografadas com bcrypt
- **RNF01** Campos senha e mfa_secret ocultos nas respostas

---

## 🛠️ Tecnologias

- **Node.js 18** + **Express 4**
- **MongoDB Atlas** + **Mongoose 8**
- **bcryptjs** (criptografia de senhas)
- **Jest** + **Supertest** (testes)
- **GitHub Actions** (CI/CD)
- **Render** (hospedagem)

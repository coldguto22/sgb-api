# SGB API 2.0 — Sistema de Gerenciamento de Biblioteca

![CI](https://github.com/coldguto22/sgb-api/actions/workflows/test.yml/badge.svg?branch=master)

API RESTful — Node.js + Express + MongoDB Atlas  
**Autores:** Jorge Rizzini · Laisa Eugênio · Otávio Lima Beato  
**Disciplina:** Laboratório Web 3 — DSM · FATEC Mauá

## Como rodar localmente

```bash
git clone https://github.com/coldguto22/sgb-api.git
cd sgb-api
npm install
cp .env.example .env   # preencha as variáveis
npm run dev
```

## Como rodar os testes

```bash
npm test
```

## Endpoints principais

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | /api/livros | Lista livros |
| GET | /api/livros/disponiveis | Livros disponíveis |
| POST | /api/emprestimos | Realiza empréstimo |
| PUT | /api/emprestimos/:id/devolver | Registra devolução |
| GET | /api/unidades | Lista unidades (público) |
| GET | /api/logs | Consulta logs (requer API Key) |

Autenticação via header `x-api-key`.
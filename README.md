# SGB API 2.0 — Sistema de Gerenciamento de Biblioteca

![CI](https://github.com/coldguto22/sgb-api/actions/workflows/test.yml/badge.svg?branch=master)

API RESTful — Node.js + Express + MongoDB Atlas  
**Autores:** Jorge Rizzini · Laisa Eugênio · Otávio Lima Beato  
**Disciplina:** Integração e Entrega Contínua (CI/CD) — DSM · FATEC Mauá

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
| GET | /api/unidades/:id/andares | Lista andares da unidade (público) |
| GET | /api/andares/:id/estantes | Lista estantes do andar (público) |
| GET | /api/logs | Consulta logs (requer API Key) |

Autenticação via header `x-api-key`.

As consultas dos andares e estantes são públicas e retornam somente os campos
necessários ao app:

- `GET /api/unidades/:id/andares` retorna `_id`, `numero_andar` e
  `nome_andar` (opcional);
- `GET /api/andares/:id/estantes` retorna `_id`, `codigo_estante` e
  `descricao` (opcional).

Ambas retornam `400` para IDs malformados e `404` quando a unidade ou o andar
não existe. Recurso existente sem filhos retorna `200` com uma lista vazia.


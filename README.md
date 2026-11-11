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
| POST | /api/auth/recuperacao-senha | Solicita instruções por e-mail (resposta genérica) |
| POST | /api/auth/recuperacao-senha/confirmar | Redefine senha com token válido |

Autenticação via header `x-api-key`.

As consultas dos andares e estantes são públicas e retornam somente os campos
necessários ao app:

- `GET /api/unidades/:id/andares` retorna `_id`, `numero_andar` e
  `nome_andar` (opcional);
- `GET /api/andares/:id/estantes` retorna `_id`, `codigo_estante` e
  `descricao` (opcional).

Ambas retornam `400` para IDs malformados e `404` quando a unidade ou o andar
não existe. Recurso existente sem filhos retorna `200` com uma lista vazia.

## Recuperação de senha

Configure as variáveis abaixo no ambiente da API. `SMTP_URL` pode ser usada no
lugar de `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e `SMTP_PASS`.

| Variável | Finalidade |
|---|---|
| `MAIL_FROM` | Endereço remetente validado no provedor de e-mail |
| `PASSWORD_RESET_URL` | Página HTTPS para orientar a redefinição; o código é enviado separadamente no e-mail |
| `SMTP_URL` | URL SMTP completa, se fornecida pelo provedor |
| `SMTP_HOST` | Host SMTP, quando não usar `SMTP_URL` |
| `SMTP_PORT` | Porta SMTP; padrão `587` |
| `SMTP_USER` | Usuário SMTP |
| `SMTP_PASS` | Senha ou app password SMTP |

O código expira após 30 minutos, só pode ser usado uma vez e é armazenado no
MongoDB apenas como hash. O endpoint de solicitação sempre retorna a mesma
resposta para não revelar se um endereço está cadastrado. O app Flutter já
solicita esses dois caminhos e permite informar o código manualmente.


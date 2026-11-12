# Carga demonstrativa de catálogo e acessos

Este script é **aditivo e idempotente**: não usa o `seed.js` histórico, não
limpa coleções e não sobrescreve contas existentes. Ele cria, quando ausentes,
três acessos de demonstração e um catálogo de títulos distintos de J.R.R.
Tolkien.

## Critério bibliográfico

O catálogo considera obras publicadas em formato de livro atribuídas a Tolkien,
incluindo edições póstumas de material seu, mas não inclui adaptações, estudos
sobre o autor, traduções repetidas nem reedições do mesmo título. Os títulos
foram consolidados a partir da apresentação da obra pela Tolkien Estate e da
bibliografia da Library of Congress. Como a produção de Tolkien inclui textos
acadêmicos, poemas e compilações com sobreposição, este é um recorte de acervo
para demonstração; novos títulos devem ser avaliados antes de serem incluídos.

Fontes consultadas:

- https://www.tolkienestate.com/writing/
- https://www.loc.gov/nls/new-materials/book-lists/lord-of-the-rings-and-other-works-by-j-r-r-tolkien/

## Execução

Defina as variáveis exclusivamente no ambiente seguro que possui acesso ao
MongoDB. Não registre senhas em `.env` versionado, commits, issues ou PRs.

```bash
MONGODB_URI='mongodb+srv://…'
DEMO_BIBLIOTECARIO_PASSWORD='uma-senha-unica-com-12-ou-mais-caracteres'
DEMO_ALUNO_PASSWORD='outra-senha-unica-com-12-ou-mais-caracteres'
DEMO_PROFESSOR_PASSWORD='terceira-senha-unica-com-12-ou-mais-caracteres'
npm run seed:demo-catalog
```

As contas criadas são:

| Perfil | E-mail |
| --- | --- |
| Bibliotecário | `bibliotecaria.demo@sgb.local` |
| Aluno | `aluno.demo@sgb.local` |
| Professor | `professor.demo@sgb.local` |

Se um e-mail já existir, a conta e a senha atuais são preservadas. Para trocar
uma senha, use o fluxo administrativo apropriado; não altere este script para
fixar credenciais.

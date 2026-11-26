# Verificações dinâmicas de segurança

O laboratório usa MongoDB descartável e identidade sintética, sem conexão com
Render ou Atlas. Os comandos abaixo devem ser executados na raiz da API após
`npm ci`. O Docker precisa estar ativo. Não use credenciais reais no laboratório.

## DAST passivo

```bash
docker compose -p sgb-security-lab -f security-lab/compose.yml up -d mongo api zap
docker compose -p sgb-security-lab -f security-lab/compose.yml run --rm --no-deps traffic
docker compose -p sgb-security-lab -f security-lab/compose.yml run --rm --no-deps report
docker compose -p sgb-security-lab -f security-lab/compose.yml down --volumes --remove-orphans
```

O tráfego normal passa pelo proxy ZAP para `GET /api/unidades`, `POST
/api/auth/login` e `GET /api/auth/me`. Não há spider nem varredura ativa. O
relatório sanitizado `security-lab/reports/zap-passive.json` contém informações
dos alertas, mas não cabeçalhos, corpos, cookies, token ou URLs com parâmetros.
O job semanal e em PR publica o artefato `zap-passive`. Falha ao iniciar,
acessar a API ou confirmar as três requisições impede o job de passar.

Os achados são informativos inicialmente. Revise risco, confiança e evidência
em ambiente isolado; registre falsos positivos e responsáveis. Após validar
uma regra específica, implemente uma política versionada que falhe o job por
`pluginId` e risco acordados; não bloqueie indiscriminadamente todos os alertas.

## IAST Contrast Assess

`npm run start:iast` carrega `@contrast/agent` antes da aplicação; `npm start`
permanece independente. O agente 5.63.0 suporta Node 22, Express 4 e Mongoose 8
conforme a [matriz oficial](https://docs.contrastsecurity.com/en/node-js-supported-technologies.html).
Requer conta Contrast com licença Assess, token de agente e acesso de rede à
instância Contrast. O fornecedor recebe telemetria da aplicação; autorize e
configure mascaramento antes de habilitar. Não grave token em arquivo ou log.

Crie o ambiente protegido `security-iast` e o secret `CONTRAST_AGENT_TOKEN` no
GitHub. Dispare manualmente o workflow **IAST - laboratorio autorizado** na
`master`. O job executa `node --import @contrast/agent app.js` na rede de
laboratório e envia os mesmos fluxos diretamente ao processo instrumentado.
Confirme no painel Contrast Assess a inicialização, aplicação
`sgb-api-security-lab`, cobertura das rotas e achados. Um job verde por si só
não comprova coleta. Não publique logs brutos do agente como artefatos.

Para executar localmente, forneça `CONTRAST__API__TOKEN` no ambiente e use:

```bash
docker compose -p sgb-iast-lab -f security-lab/compose.yml -f security-lab/compose.iast.yml up -d mongo api
docker compose -p sgb-iast-lab -f security-lab/compose.yml -f security-lab/compose.iast.yml run --rm --no-deps traffic
docker compose -p sgb-iast-lab -f security-lab/compose.yml -f security-lab/compose.iast.yml down --volumes --remove-orphans
```

Fluxos administrativos, mutações de acervo, reservas, upload e MFA não estão
cobertos. A consulta de sinais IAST depende de acesso ao painel do fornecedor.

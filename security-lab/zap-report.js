const http = require('http');
const fs = require('fs');
function get(path) {
  return new Promise((resolve, reject) => {
    http.get({ hostname: 'zap', port: 8080, path, timeout: 5000 }, (res) => {
      let body = ''; res.on('data', chunk => { body += chunk; });
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch (error) { reject(error); } });
    }).on('error', reject);
  });
}
async function main() {
  for (let i = 0; i < 60; i++) {
    const data = await get('/JSON/pscan/view/recordsToScan/');
    if (!/^\d+$/.test(String(data.recordsToScan))) throw new Error('Estado do scanner passivo indisponível');
    if (Number(data.recordsToScan) === 0) break;
    if (i === 59) throw new Error('Análise passiva não terminou');
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  const messages = await get('/JSON/core/view/messages/?baseurl=http%3A%2F%2Fapi%3A3000&start=0&count=100');
  const requests = messages.messages || [];
  for (const route of ['/api/unidades', '/api/auth/login', '/api/auth/me']) {
    if (!requests.some(item => item.requestHeader?.split('\n', 1)[0].includes(route))) throw new Error(`Tráfego ausente: ${route}`);
  }
  const data = await get('/JSON/core/view/alerts/?baseurl=http%3A%2F%2Fapi%3A3000');
  const alerts = (data.alerts || []).map(({ alert, risk, confidence, description, solution, reference, cweid, wascid, pluginId }) => ({ alert, risk, confidence, description, solution, reference, cweid, wascid, pluginId }));
  fs.mkdirSync('/reports', { recursive: true });
  fs.writeFileSync('/reports/zap-passive.json', JSON.stringify({ routes: ['/api/unidades', '/api/auth/login', '/api/auth/me'], alerts }, null, 2));
  console.log(`Tráfego confirmado; ${alerts.length} achados passivos para triagem.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });

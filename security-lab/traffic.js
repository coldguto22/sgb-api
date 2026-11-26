const http = require('http');

const target = process.env.SECURITY_TARGET || 'http://api:3000';
if (target !== 'http://api:3000') throw new Error('Alvo deve ser a API isolada');
const proxy = process.env.SECURITY_PROXY;
if (proxy && proxy !== 'http://zap:8080') throw new Error('Proxy não autorizado');

function request(method, path, body, token) {
  const data = body ? JSON.stringify(body) : null;
  const destination = new URL(proxy || target);
  return new Promise((resolve, reject) => {
    const req = http.request({ hostname: destination.hostname, port: destination.port, method,
      path: proxy ? `${target}${path}` : path,
      headers: { host: 'api:3000', ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, timeout: 10000 }, (res) => {
      let text = ''; res.on('data', (chunk) => { text += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: text }));
    });
    req.on('timeout', () => req.destroy(new Error('timeout'))); req.on('error', reject);
    if (data) req.write(data); req.end();
  });
}
async function main() {
  const publicResult = await request('GET', '/api/unidades');
  if (publicResult.status !== 200 || !Array.isArray(JSON.parse(publicResult.body))) throw new Error('Consulta pública falhou');
  const login = await request('POST', '/api/auth/login', { email: 'security@example.test', senha: 'Senha-sintetica-123' });
  if (login.status !== 200) throw new Error('Login sintético falhou');
  const token = JSON.parse(login.body).access_token;
  if (!token) throw new Error('Token ausente');
  const profile = await request('GET', '/api/auth/me', null, token);
  if (profile.status !== 200 || JSON.parse(profile.body).email !== 'security@example.test') throw new Error('Consulta autenticada falhou');
  console.log(`Fluxos públicos e autenticados: HTTP 200; proxy=${proxy ? 'ZAP' : 'não'}`);
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });

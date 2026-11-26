import { loadEnv } from 'vite';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createContext, runInContext } from 'node:vm';
import { spawn, spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';

const source = await readFile(new URL('../public/sw.js', import.meta.url), 'utf8');
function worker(hostname) {
  const handlers = {};
  const origin = `http://${hostname}:3000`;
  const self = { location: {hostname, origin}, addEventListener: (name, fn) => handlers[name] = fn };
  runInContext(source, createContext({self, URL, console}));
  return {handlers, origin};
}
test('service worker never intercepts localhost or Vite modules', () => {
  for (const host of ['localhost','127.0.0.1','[::1]','aura.example']) {
    const {handlers, origin} = worker(host);
    for (const path of ['/src/main.tsx','/@vite/client','/node_modules/.vite/deps/react.js?v=old','/__vite_ping']) {
      handlers.fetch({request: {url: origin + path, headers: new Headers(), method: 'GET', mode: 'cors'}, respondWith() {assert.fail(`Intercepted ${host}${path}`);}});
    }
    if (host !== 'aura.example') handlers.fetch({request: {url: origin + '/assets/test.js'}, respondWith() {assert.fail('Intercepted local asset');}});
  }
});
test('Express development server accepts Vite WebSocket upgrades on its HTTP port', {timeout: 90000}, async () => {
  const port = 3199;
  const child = spawn(process.execPath, ['node_modules/tsx/dist/cli.mjs', 'server.ts'], {
    cwd: new URL('..', import.meta.url), env: {...process.env, PORT: String(port), NODE_ENV: 'development', DISABLE_HMR: 'false'}, stdio: ['ignore','pipe','pipe'], windowsHide: true,
  });
  let output = '';
  child.stdout.on('data', d => output += d);
  child.stderr.on('data', d => output += d);
  let ws;
  try {
    let ready = false;
    for (let i=0;i<150;i++) {
      if (child.exitCode !== null) throw new Error(`Development server exited: ${output.slice(-1500)}`);
      if (output.includes(`localhost:${port}`)) { ready = true; break; }
      await delay(300);
    }
    assert.ok(ready, 'Development server did not start');
    const html = await (await fetch(`http://localhost:${port}/`)).text();
    assert.ok(html.includes('/@vite/client'));
    const apiModule = await (await fetch(`http://localhost:${port}/src/utils/commandApi.ts`)).text();
    const injectedApi = apiModule.match(/"VITE_COMMAND_API_BASE_URL"\s*:\s*("(?:[^"\\]|\\.)*")/)?.[1];
    assert.ok(injectedApi, 'Vite did not inject the API environment setting');
    assert.equal(JSON.parse(injectedApi), loadEnv('development', process.cwd(), 'VITE_').VITE_COMMAND_API_BASE_URL, 'Server must honor Vite environment precedence');

    assert.ok(!html.includes("serviceWorker.register('/sw.js')"), 'HTML must not register a development worker');
    const client = await (await fetch(`http://localhost:${port}/@vite/client`)).text();
    const token = client.match(/const wsToken = "([^"]+)"/)?.[1];
    assert.ok(token, 'Vite client token missing');
    ws = new WebSocket(`ws://localhost:${port}/?token=${encodeURIComponent(token)}`, 'vite-hmr');
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('HMR handshake timed out')), 10000);
      ws.addEventListener('message', event => {
        if (JSON.parse(event.data).type === 'connected') { clearTimeout(timer); resolve(); }
      });
      ws.addEventListener('error', () => { clearTimeout(timer); reject(new Error('HMR WebSocket upgrade failed')); });
    });
  } finally {
    ws?.close();
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], {windowsHide: true, stdio: 'ignore'});
    else child.kill('SIGTERM');
  }
});

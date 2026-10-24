// Full translate flow against a fake Translate Projects API (HTTP + WebSocket on localhost, no network).
import assert from 'node:assert';
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { after, before, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { WebSocketServer } from 'ws';

const TOKEN = 'good-token';
const CLI = fileURLToPath(new URL('../cli.mjs', import.meta.url));

let api; // fake server state, reset per test
let server;
let translateProject;
let generateHashText;

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

const readBody = async (req) => {
  let raw = '';
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
};

const handle = async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const lang = url.searchParams.get('target_lang');
  const route = `${req.method} ${url.pathname}`;
  api.calls.push(lang ? `${route} ${lang}` : route);

  const forced = api.fail(route, lang);
  if (forced)
    return json(res, forced, { status: 'FAILURE', message: 'forced' });

  if (req.headers.authorization !== `Token ${TOKEN}`) {
    return json(res, 401, { status: 'FAILURE', code: 'UNAUTHORIZED' });
  }

  const body = req.method === 'POST' ? await readBody(req) : {};

  switch (route) {
    case 'POST /v1/translations/validate-changes-files': {
      const changed = Object.fromEntries(
        Object.entries(body).filter(([hash, v]) => api.known[hash] !== v)
      );
      return json(res, 200, { status: 'SUCCESS', data: changed });
    }
    case 'POST /v1/translations/load-sources': {
      Object.assign(api.sources, body);
      const fileHash = await generateHashText(
        url.searchParams.get('route_file')
      );
      api.known[fileHash] = url.searchParams.get('cache_hash');
      return json(res, 200, { status: 'SUCCESS', data: { task_id: 'sync' } });
    }
    case 'POST /v1/translations/':
      return json(res, 200, { status: 'SUCCESS', data: { task_id: lang } });
    case 'GET /v1/translations/language-project': {
      // texts in api.untranslated simulate a PARTIAL / MISSING_API_KEY result
      const data = Object.fromEntries(
        Object.entries(api.sources)
          .filter(([, text]) => !api.untranslated.includes(text))
          .map(([key, text]) => [key, `${lang}:${text}`])
      );
      return json(res, 200, { status: 'SUCCESS', data });
    }
  }
  json(res, 404, { status: 'FAILURE', message: 'not found' });
};

const SOURCE = {
  home: { title: 'Hola', subtitle: 'Bienvenido' },
  'Guardar cambios': 'Guardar cambios',
};

let dir;
const file = (...p) => path.join(dir, ...p);
const readJson = (...p) => JSON.parse(fs.readFileSync(file(...p), 'utf-8'));
const writeJson = (p, data) => {
  fs.mkdirSync(path.dirname(file(p)), { recursive: true });
  fs.writeFileSync(file(p), JSON.stringify(data, null, 2));
};

const run = (opts = {}) =>
  translateProject({
    sourceLang: 'es',
    targetLangs: ['es', 'en', 'fr'],
    apiKey: TOKEN,
    ...opts,
  });

before(async () => {
  server = http.createServer((req, res) => handle(req, res));
  new WebSocketServer({ server }).on('connection', (ws) =>
    ws.send(JSON.stringify({ progress: 100 }))
  );
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  process.env.TRANSLATE_PROJECTS_API_URL = `http://127.0.0.1:${server.address().port}`;
  // the core reads the API URL on load: import it only after this line, or tests hit the real API
  ({ translateProject } = await import('../dist/index.js'));
  ({ generateHashText } = await import('translate-projects-core/utils'));
});

after(() => server.close());

beforeEach(() => {
  api = { calls: [], sources: {}, known: {}, untranslated: [], fail: () => 0 };
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tp-nextjs-'));
  process.env.HOME = dir; // the core cache lives in ~/.config
  process.chdir(dir);
  writeJson('src/locales/es/translation.json', SOURCE);
});

test('sends the texts and writes one translated file per language', async () => {
  await run();

  assert.deepStrictEqual(readJson('src/locales/en/translation.json'), {
    home: { title: 'en:Hola', subtitle: 'en:Bienvenido' },
    'Guardar cambios': 'en:Guardar cambios',
  });
  assert.strictEqual(
    readJson('src/locales/fr/translation.json').home.title,
    'fr:Hola'
  );
  assert.deepStrictEqual(readJson('src/locales/es/translation.json'), SOURCE);
  assert.deepStrictEqual(api.calls, [
    'POST /v1/translations/validate-changes-files',
    'POST /v1/translations/load-sources',
    'POST /v1/translations/ en',
    'GET /v1/translations/language-project en',
    'POST /v1/translations/ fr',
    'GET /v1/translations/language-project fr',
  ]);
});

test('scanner extracts t() and <Trans> texts before translating', async () => {
  fs.rmSync(file('src/locales'), { recursive: true });
  fs.mkdirSync(file('app'));
  fs.writeFileSync(
    file('app/page.tsx'),
    `export default () => <p>{t('Hola mundo')}<Trans>Texto largo</Trans></p>;`
  );

  await run({ targetLangs: ['en'], scanner: { sourceDir: './app' } });

  assert.deepStrictEqual(readJson('src/locales/en/translation.json'), {
    'Hola mundo': 'en:Hola mundo',
    'Texto largo': 'en:Texto largo',
  });
});

test('second run with no changes makes no translation requests', async () => {
  await run();
  api.calls = [];

  await run();

  assert.deepStrictEqual(api.calls, [
    'POST /v1/translations/validate-changes-files',
  ]);
  assert.strictEqual(
    readJson('src/locales/en/translation.json').home.title,
    'en:Hola'
  );
});

test('a changed source file is synced and translated again', async () => {
  await run();
  writeJson('src/locales/es/translation.json', { ...SOURCE, extra: 'Nuevo' });
  api.calls = [];

  await run({ targetLangs: ['en'] });

  assert.ok(api.calls.includes('POST /v1/translations/load-sources'));
  assert.strictEqual(
    readJson('src/locales/en/translation.json').extra,
    'en:Nuevo'
  );
});

test('invalid token rejects without touching any file', async () => {
  writeJson('src/locales/en/translation.json', { home: { title: 'Old' } });

  await assert.rejects(run({ apiKey: 'bad-token' }), /apiKey/);

  assert.deepStrictEqual(readJson('src/locales/es/translation.json'), SOURCE);
  assert.deepStrictEqual(readJson('src/locales/en/translation.json'), {
    home: { title: 'Old' },
  });
  assert.ok(!fs.existsSync(file('src/locales/fr')));
});

test('missing apiKey fails before calling the API', async () => {
  await assert.rejects(run({ apiKey: '' }), /Missing apiKey/);
  assert.deepStrictEqual(api.calls, []);
});

test('failed source sync is not cached and is retried next run', async () => {
  api.fail = (route) => route.endsWith('load-sources') && 400;
  await assert.rejects(run(), /Could not sync/);
  assert.ok(!fs.existsSync(file('src/locales/en')));

  api.fail = () => 0;
  api.calls = [];
  await run();
  assert.ok(api.calls.includes('POST /v1/translations/load-sources'));
  assert.strictEqual(
    readJson('src/locales/en/translation.json').home.title,
    'en:Hola'
  );
});

test('5xx on one language keeps its old file, writes the rest and retries later', async () => {
  writeJson('src/locales/fr/translation.json', { home: { title: 'Ancien' } });
  api.fail = (route, lang) =>
    route === 'POST /v1/translations/' && lang === 'fr' && 500;

  await assert.rejects(run(), /Incomplete translations for: fr/);

  assert.strictEqual(
    readJson('src/locales/en/translation.json').home.title,
    'en:Hola'
  );
  assert.deepStrictEqual(readJson('src/locales/fr/translation.json'), {
    home: { title: 'Ancien' },
  });

  api.fail = () => 0;
  api.calls = [];
  await run();
  assert.ok(api.calls.includes('POST /v1/translations/ fr'));
  assert.ok(!api.calls.includes('POST /v1/translations/ en'));
  assert.strictEqual(
    readJson('src/locales/fr/translation.json').home.title,
    'fr:Hola'
  );
});

test('partial response (MISSING_API_KEY) keeps previous texts and retries them', async () => {
  writeJson('src/locales/en/translation.json', {
    home: { subtitle: 'Welcome' },
  });
  api.untranslated = ['Bienvenido', 'Hola'];

  await assert.rejects(
    run({ targetLangs: ['en'] }),
    /Incomplete translations for: en/
  );

  // previous translation kept, never-translated text left out so i18next falls back
  assert.deepStrictEqual(readJson('src/locales/en/translation.json'), {
    home: { subtitle: 'Welcome' },
    'Guardar cambios': 'en:Guardar cambios',
  });

  api.untranslated = [];
  await run({ targetLangs: ['en'] });
  assert.deepStrictEqual(readJson('src/locales/en/translation.json').home, {
    title: 'en:Hola',
    subtitle: 'en:Bienvenido',
  });
});

const execCli = (env) =>
  promisify(execFile)(process.execPath, [CLI], {
    cwd: dir,
    env: { ...process.env, ...env },
  }).then(
    (r) => ({ code: 0, out: r.stdout + r.stderr }),
    (e) => ({ code: e.code, out: e.stdout + e.stderr })
  );

test('CLI reads translate.config.mjs, honours outputDir and exits 0', async () => {
  writeJson('locales/es/translation.json', SOURCE);
  fs.writeFileSync(
    file('translate.config.mjs'),
    `export default { sourceLang: 'es', targetLangs: ['en'], outputDir: './locales', apiKey: process.env.TP_KEY };`
  );

  const { code } = await execCli({ TP_KEY: TOKEN });

  assert.strictEqual(code, 0);
  assert.strictEqual(
    readJson('locales/en/translation.json').home.title,
    'en:Hola'
  );
});

test('CLI exits 1 without apiKey or when the API rejects the token', async () => {
  fs.writeFileSync(
    file('translate.config.mjs'),
    `export default { sourceLang: 'es', targetLangs: ['en'], apiKey: process.env.TP_KEY };`
  );

  const missing = await execCli({ TP_KEY: '' });
  assert.strictEqual(missing.code, 1);
  assert.match(missing.out, /Missing required configuration fields: apiKey/);

  const invalid = await execCli({ TP_KEY: 'bad-token' });
  assert.strictEqual(invalid.code, 1);
  assert.ok(!fs.existsSync(file('src/locales/en')));
});

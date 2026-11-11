// langMiddleware with fake requests: which locale a URL without one is sent to.
import assert from 'node:assert';
import { createRequire } from 'node:module';
import { test } from 'node:test';

// the CJS build: Node's ESM loader cannot resolve 'next/server' without an extension (bundlers can)
const { langMiddleware } = createRequire(import.meta.url)(
  '../dist/middleware/index.cjs'
);

const locales = ['es', 'en', 'pt-BR'];
const request = (path, { cookie, accept } = {}) => {
  const url = new URL(path, 'https://site.dev');
  return {
    url: url.href,
    nextUrl: url,
    cookies: {
      get: (n) =>
        n === 'NEXT_LOCALE' && cookie ? { value: cookie } : undefined,
    },
    headers: {
      get: (n) => (n === 'accept-language' ? (accept ?? null) : null),
    },
  };
};
const go = (path, opts) => {
  const res = langMiddleware({
    request: request(path, opts),
    defaultLocale: 'es',
    locales,
  });
  return res.headers.get('location');
};

test('without cookie nor browser language it goes to the default', () => {
  assert.strictEqual(go('/'), 'https://site.dev/es');
  assert.strictEqual(go('/about?x=1'), 'https://site.dev/es/about?x=1');
});

test('the NEXT_LOCALE cookie wins over the browser language', () => {
  assert.strictEqual(
    go('/', { cookie: 'en', accept: 'pt-BR' }),
    'https://site.dev/en'
  );
  assert.strictEqual(
    go('/', { cookie: 'xx', accept: 'en' }),
    'https://site.dev/en'
  );
});

test('the browser language is matched by preference, exactly or by base', () => {
  assert.strictEqual(
    go('/', { accept: 'fr;q=1, en-US;q=0.9, es;q=0.5' }),
    'https://site.dev/en'
  );
  assert.strictEqual(go('/', { accept: 'pt' }), 'https://site.dev/pt-BR');
  assert.strictEqual(
    go('/', { accept: 'pt-PT,es;q=0.1' }),
    'https://site.dev/pt-BR'
  );
  assert.strictEqual(go('/', { accept: 'de, *;q=0.5' }), 'https://site.dev/es');
});

test('a URL with a locale stays and saves it in the cookie', () => {
  const res = langMiddleware({
    request: request('/en/about'),
    defaultLocale: 'es',
    locales,
  });
  assert.strictEqual(res.headers.get('location'), null);
  assert.match(res.headers.get('set-cookie'), /NEXT_LOCALE=en/);
});

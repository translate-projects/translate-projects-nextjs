# Translate Projects NextJs

Internationalize your Next.js (App Router) app with [i18next](https://www.i18next.com/) and translate it automatically into multiple languages with [Translate Projects](https://translateprojects.dev).

[See documentation](https://docs.translateprojects.dev/docs/frameworks-javascript/react/nextjs)

## What it does

- **CLI (`translate-projects-nextjs translate`)**: reads the JSON files of your source language, syncs them with the Translate Projects API and writes one translated copy per target language. Only changed files are re-sent (local cache).
- **Scanner (optional)**: extracts keys from `t('...')` calls and `<Trans>` components in your source code and generates `<sourceLang>/translation.json` for you.
- **Runtime helpers** for Next.js:
  - `langMiddleware` – redirects to `/<locale>/...` and stores the `NEXT_LOCALE` cookie.
  - `TranslationsProvider` – creates and provides the i18next instance.
  - `Link` and `useLocalizedRouter` – navigation that prefixes the current locale automatically.
  - `useTypedTranslation` – `t()` with autocompletion of your translation keys.

## Installation

```bash
npm install translate-projects-nextjs
```

## 1. Translate your files

Create `translate.config.mjs` in the project root:

```js
export default {
  sourceLang: 'en',
  targetLangs: ['en', 'es', 'fr'],
  apiKey: process.env.TRANSLATE_PROJECTS_API_KEY,
  // Optional: extract keys from t() / <Trans> in your code
  // scanner: true,                     // scans ./src
  // scanner: { sourceDir: './app' },   // scans a custom folder
};
```

Put your source texts in `src/locales/<sourceLang>/*.json` (each file is a namespace):

```
src/locales/
└── en/
    └── translation.json
```

Add a script and run it:

```json
{
  "scripts": {
    "translate": "translate-projects-nextjs translate"
  }
}
```

```bash
npm run translate
```

Output: `src/locales/es/translation.json`, `src/locales/fr/translation.json`, …

Change the folder with `outputDir` in the config (default `./src/locales`). Unchanged files are skipped on the next run. If the API fails or returns a partial result, existing translations are kept, the command exits with code 1 and the missing texts are retried on the next run.

## 2. Use the translations in Next.js

### Middleware

```ts
// middleware.ts
import { NextRequest } from 'next/server';
import { langMiddleware } from 'translate-projects-nextjs/middleware';

export function middleware(request: NextRequest) {
  return langMiddleware({
    request,
    defaultLocale: 'en',
    locales: ['en', 'es', 'fr'],
    ignorePaths: ['/images'], // optional
  });
}
```

Paths starting with `/_next`, `/api`, `/locales` and `/favicon.ico` are always ignored.

### Provider

```tsx
// app/[locale]/layout.tsx
import { TranslationsProvider } from 'translate-projects-nextjs/provider';
import en from '@/locales/en/translation.json';
import es from '@/locales/es/translation.json';
import fr from '@/locales/fr/translation.json';

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <html lang={locale}>
      <body>
        <TranslationsProvider
          lng={locale as any}
          initialLocale={locale as any}
          i18nConfig={{
            fallbackLng: ['en'],
            supportedLngs: ['en', 'es', 'fr'],
            resources: {
              en: { translation: en },
              es: { translation: es },
              fr: { translation: fr },
            },
          }}
        >
          {children}
        </TranslationsProvider>
      </body>
    </html>
  );
}
```

You can also pass your own instance with `i18nInstance`.

### Translating texts

```tsx
'use client';
import { useTypedTranslation } from 'translate-projects-nextjs/hooks';
import type en from '@/locales/en/translation.json';

export function Title() {
  const { t } = useTypedTranslation<typeof en>();
  return <h1>{t('home.title')}</h1>; // keys are autocompleted
}
```

`useTranslation` and `<Trans>` from `react-i18next` work too.

### Navigation

```tsx
'use client';
import { Link } from 'translate-projects-nextjs/link';
import { useLocalizedRouter } from 'translate-projects-nextjs/hooks';

export function Nav() {
  const router = useLocalizedRouter();

  return (
    <>
      <Link href="/about">About</Link> {/* -> /<locale>/about */}
      <button onClick={() => router.push('/contact')}>Contact</button>
      <button onClick={() => router.push('/', undefined, 'es')}>Español</button>
    </>
  );
}
```

## Exports

| Import path                            | Exports                                     |
| -------------------------------------- | ------------------------------------------- |
| `translate-projects-nextjs`            | `translateProject`                          |
| `translate-projects-nextjs/middleware` | `langMiddleware`, `LangMiddlewareOptions`   |
| `translate-projects-nextjs/provider`   | `TranslationsProvider`                      |
| `translate-projects-nextjs/hooks`      | `useLocalizedRouter`, `useTypedTranslation` |
| `translate-projects-nextjs/link`       | `Link`                                      |
| `translate-projects-nextjs/types`      | `I18nConfig`                                |

## Development

```bash
npm install
npm run build   # tsup -> dist/ (cjs + esm + d.ts)
npm test        # build + tests against a fake API, no network
npm run lint
npm run format
```

## Support

If you have any questions, need help, or want to contribute, feel free to reach out:

- **Website**: [neiderruiz.com](https://neiderruiz.com)
- **GitHub**: [@neiderruiz](https://github.com/neiderruiz)
- **Twitter**: [@neiderruiz](https://x.com/neiderruiz_)
- **YouTube**: [Neider Ruiz](https://youtube.com/@neiderruiz)

## Support the Project

If you find this project useful, consider buying me a coffee to help me keep improving it. Your support means a lot! ☕

[![Buy me a coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=☕&slug=neiderruiz&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/neiderruiz)

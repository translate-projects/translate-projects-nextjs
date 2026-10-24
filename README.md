# Translate Projects NextJs

Translate your Next.js (App Router) app into multiple languages with [Translate Projects](https://translateprojects.dev) and use the translations at runtime with [i18next](https://www.i18next.com/).

[See documentation](https://docs.translateprojects.dev/docs/frameworks-javascript/react/nextjs)

The package has two parts:

- **CLI** `translate-projects-nextjs translate`: reads your source-language JSON files, sends them to the Translate Projects API and writes one translated copy per target language. Only files that changed are sent again.
- **Runtime helpers** for Next.js: `langMiddleware`, `TranslationsProvider`, `Link`, `useLocalizedRouter` and `useTypedTranslation`.

## Requirements

- Node.js **20 or newer**
- Next.js with the **App Router** (tested with Next.js 15) and React 18+
- A project on [translateprojects.dev](https://translateprojects.dev) with:
  - its **default language** equal to your `sourceLang`
  - every language in `targetLangs` **enabled**
  - an **AI model and AI API key** configured in the project settings (needed to translate new texts)
  - a **project token** (this is your `TRANSLATE_PROJECTS_API_KEY`)

## Quick start (checklist)

1. `npm install translate-projects-nextjs`
2. Set `TRANSLATE_PROJECTS_API_KEY` in your environment.
3. Create `translate.config.mjs` in the project root.
4. Put your source texts in `src/locales/<sourceLang>/translation.json`.
5. Run `npx translate-projects-nextjs translate`.
6. Add `middleware.ts` and `TranslationsProvider` to `app/[locale]/layout.tsx`.

Each step is explained below.

## 1. Install

```bash
npm install translate-projects-nextjs
```

## 2. API key

The CLI authenticates with your project token. Keep it out of git:

```bash
# .env.local, CI secret or shell
export TRANSLATE_PROJECTS_API_KEY=your-project-token
```

The CLI does not load `.env` files by itself. Export the variable in the shell or CI, or load it yourself (for example `node --env-file=.env.local node_modules/.bin/translate-projects-nextjs translate`).

## 3. Configuration and command

Create `translate.config.mjs` in the project root (the folder where you run the command):

```js
export default {
  sourceLang: 'es', // language of your source files (project default language)
  targetLangs: ['en', 'pt-BR', 'fr'], // languages to generate
  apiKey: process.env.TRANSLATE_PROJECTS_API_KEY,
  outputDir: './src/locales', // optional, this is the default
  // scanner: true,                   // optional: extract texts from ./src
  // scanner: { sourceDir: './app' }, // optional: extract texts from another folder
};
```

| Option        | Required | Description                                                                                                                                             |
| ------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sourceLang`  | yes      | Language code of your source texts, e.g. `es`, `en`.                                                                                                    |
| `targetLangs` | yes      | Language codes to generate, e.g. `['en', 'pt-BR', 'fr']`. If `sourceLang` is listed it is ignored.                                                      |
| `apiKey`      | yes      | Project token. Use `process.env.TRANSLATE_PROJECTS_API_KEY`.                                                                                            |
| `outputDir`   | no       | Folder that contains one subfolder per language. Default `./src/locales`.                                                                               |
| `scanner`     | no       | `true` or `{ sourceDir }`. Scans `.js/.jsx/.ts/.tsx` files for `t('...')` and `<Trans>` and **overwrites** `<outputDir>/<sourceLang>/translation.json`. |

Source files: any `.json` file inside `<outputDir>/<sourceLang>/` (subfolders included). Each file is an i18next namespace; nesting is kept.

```json
// src/locales/es/translation.json
{
  "home": {
    "title": "Bienvenido a nuestra tienda",
    "cta": "Comprar ahora"
  },
  "Cerrar sesión": "Cerrar sesión"
}
```

Run it:

```bash
npx translate-projects-nextjs translate
```

Or add a script to `package.json`:

```json
{
  "scripts": {
    "translate": "translate-projects-nextjs translate"
  }
}
```

The command exits with code `0` when every language was translated and `1` on any error, so it can be used in CI.

## 4. Generated files

For each source file and each target language the CLI writes a file with the **same name and structure** into `<outputDir>/<lang>/`:

```
src/locales/
├── es/translation.json     ← your source (never modified, unless scanner is on)
├── en/translation.json     ← generated
├── pt-BR/translation.json  ← generated
└── fr/translation.json     ← generated
```

```json
// src/locales/en/translation.json
{
  "home": {
    "title": "Welcome to our store",
    "cta": "Buy now"
  },
  "Cerrar sesión": "Log out"
}
```

Commit the generated files: the app imports them at build time. Do not edit them by hand; they are overwritten on the next run.

## 5. Cache and how to force a new translation

- On each run the CLI asks the API which source files changed. Files that did not change are **not sent or translated again**: a run with no changes makes a single request and finishes in about a second.
- Changing a text in a source file sends only that file again.
- The local cache is stored in `~/.config/translate-projects-core/cache.json` (Windows: `%APPDATA%\translate-projects-core\cache.json`), keyed by the folder where you run the command.

To force:

| You want                                   | Do this                                                                                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Regenerate a deleted or edited output file | Delete `<outputDir>/<lang>/<file>.json` and run again. It is rewritten from the cache, without new requests.                                                     |
| Sync and translate everything again        | Delete `~/.config/translate-projects-core/cache.json` and run again. This resets the cache of every project on the machine; each one syncs once on its next run. |

## 6. Use the translations in Next.js

Folder layout used below (adapt the import paths to yours):

```
app/[locale]/layout.tsx
app/[locale]/page.tsx
middleware.ts
src/locales/<lang>/translation.json
```

### Middleware

Redirects `/about` to `/<defaultLocale>/about` and stores the chosen locale in the `NEXT_LOCALE` cookie.

```ts
// middleware.ts
import { NextRequest } from 'next/server';
import { langMiddleware } from 'translate-projects-nextjs/middleware';

export function middleware(request: NextRequest) {
  return langMiddleware({
    request,
    defaultLocale: 'es',
    locales: ['es', 'en', 'pt-BR', 'fr'],
    ignorePaths: ['/images'], // optional
  });
}
```

Paths starting with `/_next`, `/api`, `/locales` and `/favicon.ico` are always ignored.

### Provider

```tsx
// app/[locale]/layout.tsx
import { TranslationsProvider } from 'translate-projects-nextjs/provider';
import es from '../../src/locales/es/translation.json';
import en from '../../src/locales/en/translation.json';
import ptBR from '../../src/locales/pt-BR/translation.json';
import fr from '../../src/locales/fr/translation.json';

const locales = ['es', 'en', 'pt-BR', 'fr'];

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

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
            fallbackLng: ['es'],
            supportedLngs: locales,
            resources: {
              es: { translation: es },
              en: { translation: en },
              'pt-BR': { translation: ptBR },
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

You can also pass your own i18next instance with `i18nInstance`. Missing texts fall back to `fallbackLng`.

### Translating texts

```tsx
'use client';
import { useTypedTranslation } from 'translate-projects-nextjs/hooks';
import type es from '../../src/locales/es/translation.json';

export function Title() {
  const { t } = useTypedTranslation<typeof es>();
  return <h1>{t('home.title')}</h1>; // keys are autocompleted
}
```

`useTranslation` and `<Trans>` from `react-i18next` work too. Hooks, `Link` and the provider are client components.

### Navigation

```tsx
'use client';
import { Link } from 'translate-projects-nextjs/link';
import { useLocalizedRouter } from 'translate-projects-nextjs/hooks';

export function Nav() {
  const router = useLocalizedRouter();

  return (
    <>
      <Link href="/about">About</Link> {/* -> /<current locale>/about */}
      <button onClick={() => router.push('/contact')}>Contact</button>
      <button onClick={() => router.push('/', undefined, 'en')}>English</button>
    </>
  );
}
```

## Common errors

When something fails, files that already exist are **never deleted or emptied**, the command exits with code `1`, and the failed parts are retried on the next run.

| Message in the output                                                                                                                        | Cause                                                                                                                                           | Fix                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Missing required configuration fields: apiKey`                                                                                              | `TRANSLATE_PROJECTS_API_KEY` is not set in the environment.                                                                                     | Export the variable (see [API key](#2-api-key)).                                                                                                                    |
| `Configuration file "translate.config.mjs" not found in project root.`                                                                       | The command was run from another folder or the file has another name.                                                                           | Run it from the folder that contains `translate.config.mjs`.                                                                                                        |
| `API Error (401): UNAUTHORIZED: Token no válido` followed by `Could not validate files with Translate Projects. Check your apiKey.`          | The token is wrong, revoked or from another project.                                                                                            | Copy the project token again from translateprojects.dev.                                                                                                            |
| `Could not sync <file> with Translate Projects.` (e.g. after `El idioma de origen no es el predeterminado`)                                  | `sourceLang` is not the project's default language, or the file is invalid.                                                                     | Set the project's default language to `sourceLang` and check the JSON is valid.                                                                                     |
| `El idioma de destino no está activo en tu proyecto` followed by `Incomplete translations for: <lang>`                                       | A language in `targetLangs` is not enabled in the project.                                                                                      | Enable that language in the project, or remove it from `targetLangs`.                                                                                               |
| `<n> texts without translation in <LANG>, they will be retried on the next run` and `Incomplete translations for: <lang>`                    | **Partial translation.** Usually the project has no AI model / AI API key configured, so only texts that already had a translation were filled. | Configure the AI model and AI API key in the project settings and run the command again. Texts already translated are reused; only the missing ones are translated. |
| `Server unavailable (503, attempt n/3). Retrying...`, `Request failed: ...` or `API Error (500)`, then `Incomplete translations for: <lang>` | Temporary API or network problem. Network errors and 429/502/503/504 are retried 3 times; each request waits up to 60 s.                        | Run the command again later.                                                                                                                                        |

During a partial translation, texts that already had a translation keep it and texts that never had one are left out of the file, so i18next shows the `fallbackLng` text until the next run fills them.

## Exports

| Import path                            | Exports                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------ |
| `translate-projects-nextjs`            | `translateProject` (same as the CLI, as a function that throws on error) |
| `translate-projects-nextjs/middleware` | `langMiddleware`, `LangMiddlewareOptions`                                |
| `translate-projects-nextjs/provider`   | `TranslationsProvider`                                                   |
| `translate-projects-nextjs/hooks`      | `useLocalizedRouter`, `useTypedTranslation`                              |
| `translate-projects-nextjs/link`       | `Link`                                                                   |
| `translate-projects-nextjs/types`      | `I18nConfig`                                                             |

## Development

```bash
npm install
npm run build   # tsup -> dist/ (cjs + esm + d.ts)
npm test        # build + tests against a fake API, no network
npm run format
```

Set `TRANSLATE_PROJECTS_API_URL` to point the CLI to another backend (local or staging).

## Support

If you have any questions, need help, or want to contribute, feel free to reach out:

- **Website**: [neiderruiz.com](https://neiderruiz.com)
- **GitHub**: [@neiderruiz](https://github.com/neiderruiz)
- **Twitter**: [@neiderruiz](https://x.com/neiderruiz_)
- **YouTube**: [Neider Ruiz](https://youtube.com/@neiderruiz)

## Support the Project

If you find this project useful, consider buying me a coffee to help me keep improving it. Your support means a lot! ☕

[![Buy me a coffee](https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=☕&slug=neiderruiz&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff)](https://www.buymeacoffee.com/neiderruiz)

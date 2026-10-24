import { defineConfig, Options } from 'tsup';

// Entries that use React context/hooks: Next.js needs 'use client' on the published file
const clientEntries = [
  'src/hooks/index.ts',
  'src/provider/index.ts',
  'src/links/index.ts',
];

const common: Options = {
  format: ['cjs', 'esm'],
  dts: true,
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  splitting: false,
};

export default defineConfig([
  {
    ...common,
    entry: ['src/**/*.{ts,tsx}', ...clientEntries.map((e) => `!${e}`)],
  },
  // bundling drops module directives, so add it back as a banner
  {
    ...common,
    entry: clientEntries,
    banner: { js: "'use client';" },
  },
]);

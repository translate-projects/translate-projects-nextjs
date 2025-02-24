import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/**/*.{ts,tsx}'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  splitting: false,
});

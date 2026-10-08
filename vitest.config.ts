import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Unit tests in the node environment: no jsdom, no network. Components are
// checked by rendering them to static markup, so JSX is compiled here with the
// automatic runtime, because the app's tsconfig leaves JSX for Next to compile.
// The Loops client is injected in tests; nothing here hits a real workspace.
export default defineConfig({
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**', '.next/**'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Type-aware linting of the fixtures takes a few seconds.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});

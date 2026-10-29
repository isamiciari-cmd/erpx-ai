import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    // Database acceptance scripts have their own Node entry points and runner.
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx,mjs,cjs}'],
  },
});

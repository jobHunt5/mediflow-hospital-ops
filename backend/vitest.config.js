import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    // Set before any test file (and its imports) run, so server.js's
    // `import 'dotenv/config'` sees these already present and leaves them
    // alone — dotenv never overwrites an existing process.env value.
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://basilsunny@localhost:5432/mediflow_test?schema=public',
      JWT_SECRET: 'test-only-secret-do-not-use-in-prod',
      PORT: '5099',
    },
    fileParallelism: false,
    hookTimeout: 20000,
    testTimeout: 10000,
  },
});

import { defineConfig } from "vitest/config";
import path from "node:path";

// Live integration tests: `npm run test:live` (needs QLOO_API_KEY in .env.local or the environment).
try {
  process.loadEnvFile(".env.local");
} catch {
  /* no .env.local: rely on the real environment */
}

export default defineConfig({
  test: {
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 60_000,
  },
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
});

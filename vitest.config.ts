import { defineConfig } from "vitest/config";
import path from "path";
export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src"), "server-only": path.resolve(__dirname, "tests/empty.ts") } },
  test: { include: ["tests/**/*.test.ts"], environment: "node", env: { AUTH_SECRET: "test-secret-test-secret-test-secret-123", DATABASE_URL: "postgresql://x:x@localhost:5432/x" } },
});

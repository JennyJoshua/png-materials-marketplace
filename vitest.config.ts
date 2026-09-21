import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    env: {
      // Test-only value. Real secrets never live in source code.
      AUTH_SECRET: "test-only-secret-that-is-at-least-32-characters-long",
      NODE_ENV: "test",
    },
  },
});

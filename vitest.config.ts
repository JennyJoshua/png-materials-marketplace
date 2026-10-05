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
      // Test-only placeholders. Tests mock Supabase and Prisma; no real credentials are ever used.
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.test",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
      SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
      NODE_ENV: "test",
    },
  },
});

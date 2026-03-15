import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts"],
    exclude: ["tests/e2e/**"],
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup/vitest.setup.ts"],
    coverage: {
      reporter: ["text", "lcov"],
      exclude: ["**/node_modules/**", "**/.next/**", "**/tests/**"]
    }
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./")
    }
  }
});

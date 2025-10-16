import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
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

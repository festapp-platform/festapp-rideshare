import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["__tests__/**/*.test.{ts,tsx}"],
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@festapp/shared": path.resolve(__dirname, "../../packages/shared/src"),
    },
    dedupe: ["react", "react-dom"],
  },
});

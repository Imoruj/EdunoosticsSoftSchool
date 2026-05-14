import path from "path";
import { defineConfig } from "vitest/config";

/** Vitest config for HTTP deploy smoke tests only (`npm run test:smoke`). */
export default defineConfig({
    test: {
        environment: "node",
        globals: true,
        setupFiles: ["./src/test/setup.ts"],
        include: ["src/smoke/**/*.test.ts"],
        exclude: ["**/node_modules/**", "**/dist/**"],
        testTimeout: 25_000,
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});

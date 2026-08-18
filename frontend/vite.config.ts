import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// The shared /locales/uz.json file lives one level above this project
// root. Only that directory is allow-listed (not the whole repo root,
// which would also expose backend/.env, .git/, etc. -- a real risk
// once the dev server is tunneled publicly for Telegram testing).
const localesDir = fileURLToPath(new URL("../locales", import.meta.url));

export default defineConfig({
  plugins: [react()],
  server: {
    fs: {
      allow: [".", localesDir],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    globals: true,
  },
});

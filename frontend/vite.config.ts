import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // The shared /locales/uz.json file lives one level above this
    // project root, so the dev server needs permission to read it.
    fs: {
      allow: [".."],
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/setupTests.ts",
    globals: true,
  },
});

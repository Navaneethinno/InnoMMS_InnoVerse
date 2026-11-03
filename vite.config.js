import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // Libraries and English text change rarely: browsers keep them cached
        // across releases.
        manualChunks(id) {
          if (/node_modules[/](react|react-dom|scheduler|react-router|react-router-dom|@remix-run)[/]/.test(id)) return "vendor-react";
          if (/locales[/]en\.js$/.test(id)) return "locale-en";
          return undefined;
        },
      },
    },
  },
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});

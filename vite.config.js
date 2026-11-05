import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, mkdirSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

// The face detector's runtime is served with the portal, never from a CDN. Taken
// from the installed package at every dev start and build, so the version
// always matches (public/mediapipe-wasm is not committed).
const wasmFrom = fileURLToPath(new URL("./node_modules/@mediapipe/tasks-vision/wasm", import.meta.url));
const wasmTo = fileURLToPath(new URL("./public/mediapipe-wasm", import.meta.url));
mkdirSync(wasmTo, { recursive: true });
for (const file of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"])
  cpSync(`${wasmFrom}/${file}`, `${wasmTo}/${file}`);

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

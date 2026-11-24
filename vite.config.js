import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cpSync, mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";

// The face detector's runtime is served with the portal, never from a CDN. Taken
// from the installed package at every dev start and build, so the version
// always matches (public/mediapipe-wasm is not committed).
const wasmFrom = fileURLToPath(new URL("./node_modules/@mediapipe/tasks-vision/wasm", import.meta.url));
const wasmTo = fileURLToPath(new URL("./public/mediapipe-wasm", import.meta.url));
mkdirSync(wasmTo, { recursive: true });
for (const file of ["vision_wasm_internal.js", "vision_wasm_internal.wasm", "vision_wasm_nosimd_internal.js", "vision_wasm_nosimd_internal.wasm"])
  cpSync(`${wasmFrom}/${file}`, `${wasmTo}/${file}`);

// MediaPipe's task library posts usage logs to Google from the visitor's
// browser each time a detector closes. The portal sends nothing to a third
// party, so that address is swapped for one that fails on the device (the
// library catches the failure and stops logging), and a build that still
// contains the address is refused. Same as the customer portal.
const LOG_URL = "https://odml.pa.googleapis.com/v1/log";
const noUsageLogs = () => ({
  name: "no-usage-logs",
  transform(code, id) {
    if (!id.includes("@mediapipe/tasks-vision") || !code.includes(LOG_URL)) return null;
    return { code: code.replaceAll(LOG_URL, "data:,"), map: null };
  },
  generateBundle(_options, bundle) {
    for (const file of Object.values(bundle)) {
      if (file.type === "chunk" && file.code.includes(LOG_URL)) this.error(`${file.fileName} still sends usage logs to ${LOG_URL}`);
    }
  },
});

// The Content-Security-Policy of the built portal (PCI SSS web): scripts only
// from our own server (plus WebAssembly for the face detector), data only to
// our API, so an injected script can't run or send data elsewhere. Not in
// dev, where Vite's hot reload needs inline scripts. public/.htaccess sends
// the headers a <meta> tag can't (frame-ancestors and the rest).
function contentSecurityPolicy() {
  let policy = "";
  return {
    name: "content-security-policy",
    apply: "build",
    configResolved(config) {
      const base = config.env.VITE_API_BASE_URL;
      if (!base) throw new Error("VITE_API_BASE_URL is not set: add it to .env");
      const api = new URL(base).origin;
      const socket = api.replace(/^http/, "ws");
      policy = [
        "default-src 'self'",
        "script-src 'self' 'wasm-unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        `img-src 'self' data: blob: ${api}`,
        "font-src 'self' data:",
        `connect-src 'self' data: blob: ${api} ${socket}`,
        "media-src 'self' data: blob:",
        "worker-src 'self' blob:",
        "frame-src blob: https://www.openstreetmap.org",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join("; ");
    },
    transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: policy }, injectTo: "head-prepend" }],
  };
}

// The release number is package.json's, so one place says which build is live.
const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

export default defineConfig({
  plugins: [react(), noUsageLogs(), contentSecurityPolicy()],
  // Served as written (not pre-bundled) so the plugin above sees the library in development too.
  optimizeDeps: { exclude: ["@mediapipe/tasks-vision"] },
  define: { "import.meta.env.VITE_APP_VERSION": JSON.stringify(version) },
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

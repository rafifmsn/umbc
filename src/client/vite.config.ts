import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ mode }) => {
  const rootDir = path.resolve(import.meta.dirname, "../../");
  const env = {
    ...loadEnv(mode, rootDir, ""),
    ...loadEnv(mode, process.cwd(), ""),
    ...process.env,
  };

  const umamiUrl = env.UMAMI_SITE_URL || env.VITE_UMAMI_SITE_URL;
  const umamiId = env.UMAMI_SITE_ID || env.VITE_UMAMI_SITE_ID;

  return {
    plugins: [
      react(),
      {
        name: "html-transform-umami",
        transformIndexHtml(html) {
          if (umamiUrl && umamiId) {
            const scriptTag = `<script defer src="${umamiUrl}" data-website-id="${umamiId}"></script>`;
            return html.replace("<!-- %UMAMI_ANALYTICS% -->", scriptTag);
          }
          return html.replace("<!-- %UMAMI_ANALYTICS% -->", "");
        },
      },
    ],
    envDir: rootDir,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: "http://localhost:3000",
          changeOrigin: true,
        },
      },
    },
    build: {
      target: "esnext",
    },
  };
});

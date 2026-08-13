import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(() => {
  const buildId = process.env.VITE_BUILD_ID || new Date().toISOString().replace(/[:.]/g, "-");
  const staticDemo = process.env.VITE_STATIC_DEMO === "true";

  return {
    base: process.env.VITE_APP_BASE || "/",
    build: { outDir: staticDemo ? "dist-static" : "dist" },
    plugins: [
      vue(),
      {
        name: "richesses-build-id",
        transformIndexHtml(html: string) {
          return html.replace("</head>", `    <meta name="richesses-build" content="${buildId}" />\n  </head>`);
        }
      }
    ],
    server: {
      host: "0.0.0.0",
      port: 5173,
      proxy: {
        "/socket.io": { target: "http://localhost:3001", ws: true },
        "/api": { target: "http://localhost:3001" }
      }
    }
  };
});

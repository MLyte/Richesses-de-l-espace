import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig(() => {
  const buildId = process.env.VITE_BUILD_ID || new Date().toISOString().replace(/[:.]/g, "-");
  const localGame = process.env.VITE_LOCAL_GAME === "true";

  return {
    base: process.env.VITE_APP_BASE || "/",
    build: { outDir: localGame ? "dist-static" : "dist" },
    plugins: [
      vue(),
      {
        name: "richesses-build-id",
        transformIndexHtml(html: string) {
          const contextualized = localGame
            ? html.replace("aventure économique spatiale multijoueur", "aventure économique spatiale en solo contre ordinateur")
            : html;
          return contextualized.replace("</head>", `    <meta name="richesses-build" content="${buildId}" />\n  </head>`);
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

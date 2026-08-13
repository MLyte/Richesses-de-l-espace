import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(() => {
  const buildId = process.env.VITE_BUILD_ID || new Date().toISOString().replace(/[:.]/g, "-");
  const localGame = process.env.VITE_LOCAL_GAME === "true";

  return {
    base: process.env.VITE_APP_BASE || "/",
    build: { outDir: localGame ? "dist-static" : "dist" },
    plugins: [
      vue(),
      VitePWA({
        strategies: "injectManifest",
        srcDir: "src",
        filename: "sw.js",
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: ["favicon.svg", "apple-touch-icon.png"],
        manifest: {
          name: "Richesses de l’espace",
          short_name: "Richesses espace",
          description: "Aventure économique spatiale multijoueur.",
          lang: "fr",
          start_url: ".",
          scope: ".",
          display: "standalone",
          orientation: "any",
          background_color: "#06111f",
          theme_color: "#06111f",
          icons: [
            { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
            { src: "pwa-512x512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
          ]
        },
        injectManifest: {
          globPatterns: ["**/*.{js,css,html,svg,png,webp,avif,woff2}"],
        }
      }),
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

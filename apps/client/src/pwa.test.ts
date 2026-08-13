import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const clientRoot = fileURLToPath(new URL("..", import.meta.url));
const viteConfig = readFileSync(fileURLToPath(new URL("../vite.config.ts", import.meta.url)), "utf8");
const index = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
const createGame = readFileSync(fileURLToPath(new URL("./views/CreateGameView.vue", import.meta.url)), "utf8");
const serviceWorker = readFileSync(fileURLToPath(new URL("./sw.js", import.meta.url)), "utf8");

describe("installable fullscreen web app", () => {
  it("defines a base-relative standalone manifest with all required icons", () => {
    expect(viteConfig).toContain('start_url: "."');
    expect(viteConfig).toContain('scope: "."');
    expect(viteConfig).toContain('display: "standalone"');
    expect(viteConfig).toContain('lang: "fr"');
    for (const icon of ["apple-touch-icon.png", "pwa-192x192.png", "pwa-512x512.png", "pwa-512x512-maskable.png"]) {
      expect(existsSync(`${clientRoot}/public/${icon}`), icon).toBe(true);
    }
  });

  it("keeps game traffic out of runtime caching", () => {
    expect(viteConfig).toContain('strategies: "injectManifest"');
    expect(serviceWorker).toContain("precacheAndRoute(self.__WB_MANIFEST)");
    expect(serviceWorker).toContain('/\\/socket\\.io(?:\\/|$)/');
    expect(serviceWorker).toContain('/\\/api(?:\\/|$)/');
    expect(serviceWorker).not.toContain("NetworkFirst");
    expect(serviceWorker).not.toContain("CacheFirst");
  });

  it("provides platform metadata and a capability-based install affordance", () => {
    expect(index).toContain('apple-mobile-web-app-capable" content="yes"');
    expect(index).toContain('apple-mobile-web-app-status-bar-style" content="black-translucent"');
    expect(createGame).toContain("Mode plein écran");
    expect(createGame).toContain('v-if="canInstall"');
    expect(createGame).not.toMatch(/Brave|Safari|Chrome/);
  });
});

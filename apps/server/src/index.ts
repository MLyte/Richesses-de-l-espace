import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { Server } from "socket.io";
import { getLanAddresses } from "./network-addresses";
import { RoomStore } from "./room-store";
import { registerSocketHandlers } from "./socket-handlers";

const production = process.env.NODE_ENV === "production";
const port = Number(process.env.PORT ?? (production ? 3000 : 3001));
const publicPort = Number(process.env.PUBLIC_PORT ?? (production ? port : 5173));
const publicOrigin = process.env.PUBLIC_ORIGIN?.trim() || undefined;
if (production && !publicOrigin) {
  throw new Error("PUBLIC_ORIGIN est obligatoire en production (par exemple https://jeu.mathieuluyten.be).");
}
const app = express();
if (production) app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((_request, response, next) => {
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
  response.setHeader("X-Frame-Options", "DENY");
  if (production) {
    response.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    response.setHeader("Content-Security-Policy", "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; img-src 'self' data:; font-src 'self'; style-src 'self'; script-src 'self'; connect-src 'self' wss:");
  }
  next();
});
const server = http.createServer(app);
const socketOrigin = publicOrigin ? new URL(publicOrigin).origin : undefined;
const io = new Server(server, { serveClient: false, ...(socketOrigin ? { cors: { origin: socketOrigin, methods: ["GET", "POST"] } } : {}) });
const store = new RoomStore();

app.get("/api/health", (_request, response) => response.json({ ok: true, persistentRooms: store.persistent, name: "Richesses de l’espace" }));

if (production) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const clientDir = path.resolve(currentDir, "../../client/dist");
  app.use(express.static(clientDir, { index: false }));
  app.get("/{*path}", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.sendFile(path.join(clientDir, "index.html"));
  });
}

await store.initialize();
registerSocketHandlers(io, store, publicPort, publicOrigin);
const cleanupTimer = setInterval(() => { void store.purgeExpired().catch((error) => console.error("Nettoyage des salles impossible", error)); }, 60 * 60_000);
cleanupTimer.unref();

server.listen(port, "0.0.0.0", () => {
  console.log(`\nRichesses de l’espace est prêt`);
  console.log(`Local   http://localhost:${publicPort}/display`);
  for (const address of getLanAddresses()) console.log(`Réseau  http://${address}:${publicPort}/display`);
  if (publicOrigin) console.log(`Internet ${publicOrigin}`);
  console.log("");
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal} reçu, arrêt sécurisé…`);
  clearInterval(cleanupTimer);
  io.close();
  server.close(async () => {
    await store.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.once("SIGTERM", () => { void shutdown("SIGTERM"); });
process.once("SIGINT", () => { void shutdown("SIGINT"); });

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
const app = express();
if (production) app.set("trust proxy", 1);
const server = http.createServer(app);
const io = new Server(server, { serveClient: false });

app.get("/api/health", (_request, response) => response.json({ ok: true, name: "Richesses de l’espace" }));

if (production) {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const clientDir = path.resolve(currentDir, "../../client/dist");
  app.use(express.static(clientDir, { index: false }));
  app.get("/{*path}", (_request, response) => {
    response.setHeader("Cache-Control", "no-store");
    response.sendFile(path.join(clientDir, "index.html"));
  });
}

registerSocketHandlers(io, new RoomStore(), publicPort, publicOrigin);

server.listen(port, "0.0.0.0", () => {
  console.log(`\nRichesses de l’espace est prêt`);
  console.log(`Local   http://localhost:${publicPort}/display`);
  for (const address of getLanAddresses()) console.log(`Réseau  http://${address}:${publicPort}/display`);
  if (publicOrigin) console.log(`Internet ${publicOrigin}`);
  console.log("");
});

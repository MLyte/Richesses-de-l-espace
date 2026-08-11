import { spawn } from "node:child_process";

const port = 3210;
const child = spawn(process.execPath, ["apps/server/dist/index.js"], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: "production", PORT: String(port), PUBLIC_PORT: String(port), PUBLIC_ORIGIN: `http://127.0.0.1:${port}`, ALLOW_IN_MEMORY_ROOMS: "1" },
  stdio: ["ignore", "pipe", "pipe"]
});

let output = "";
child.stdout.on("data", (chunk) => { output += String(chunk); });
child.stderr.on("data", (chunk) => { output += String(chunk); });

try {
  const deadline = Date.now() + 8_000;
  while (!output.includes("Richesses de l’espace est prêt") && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 100));
  if (!output.includes("Richesses de l’espace est prêt")) throw new Error(`Le serveur n'a pas démarré.\n${output}`);
  const health = await fetch(`http://127.0.0.1:${port}/api/health`);
  const display = await fetch(`http://127.0.0.1:${port}/display`);
  const favicon = await fetch(`http://127.0.0.1:${port}/favicon.svg`);
  if (!health.ok || !(await health.json()).ok) throw new Error("L’endpoint de santé ne répond pas.");
  if (!display.ok || !(await display.text()).includes("<div id=\"app\"></div>")) throw new Error("Le client produit n’est pas servi.");
  if (!favicon.ok || favicon.headers.get("content-type") !== "image/svg+xml") throw new Error("Le favicon n’est pas servi correctement.");
  console.log("Smoke test production réussi : API, écran commun et favicon accessibles.");
} finally {
  child.kill();
}

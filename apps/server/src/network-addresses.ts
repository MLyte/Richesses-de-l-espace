import os from "node:os";

export function getLanAddresses(): string[] {
  const addresses = new Set<string>();
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== "IPv4" || entry.internal) continue;
      if (/^(169\.254|127\.)/.test(entry.address)) continue;
      addresses.add(entry.address);
    }
  }
  return [...addresses];
}

export function getJoinUrls(code: string, port: number, publicOrigin?: string): string[] {
  const urls = new Set<string>();
  if (publicOrigin) urls.add(`${publicOrigin.replace(/\/$/, "")}/play/${code}`);
  for (const address of getLanAddresses()) urls.add(`http://${address}:${port}/play/${code}`);
  return [...urls];
}

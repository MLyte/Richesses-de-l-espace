import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  platform: "node",
  target: "node24",
  outDir: "dist",
  clean: true,
  bundle: true,
  noExternal: ["@richesses-espace/game", "@richesses-espace/protocol"]
});

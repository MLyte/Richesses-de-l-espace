import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const notice = readFileSync(fileURLToPath(new URL("./LandingNotice.vue", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("../styles.css", import.meta.url)), "utf8");

describe("landing notice visuals", () => {
  it("keeps concession artwork and gives special spaces a dedicated card", () => {
    expect(notice).toContain('<AssetCard v-if="asset"');
    expect(notice).toContain('v-else-if="space.type === \'special\'" class="landing-notice__special-card"');
    expect(notice).toContain("{{ card?.title ?? meta.title }}");
    expect(notice).toContain('<GameIcon :name="meta.icon" />');
    expect(theme).toMatch(/\.landing-notice__special-card\s*\{[^}]*min-height:\s*190px[^}]*background:/s);
  });
});

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const index = readFileSync(fileURLToPath(new URL("../index.html", import.meta.url)), "utf8");
const theme = readFileSync(fileURLToPath(new URL("./theme-space.css", import.meta.url)), "utf8");

describe("mobile page zoom guards", () => {
  it("disables browser page scaling in the application viewport", () => {
    expect(index).toMatch(/name="viewport" content="[^"]*maximum-scale=1\.0[^"]*user-scalable=no[^"]*"/);
  });

  it("prevents double-tap zoom without cancelling ordinary taps or scrolling", () => {
    expect(theme).toMatch(/html, body, #app\s*\{[^}]*touch-action:\s*manipulation/s);
  });

  it("keeps touch form controls above the iOS focus-zoom threshold", () => {
    expect(theme).toMatch(/@media \(hover: none\) and \(pointer: coarse\)\s*\{\s*input, select, textarea\s*\{[^}]*font-size:\s*16px !important/s);
  });
});

import { describe, expect, it } from "vitest";
import { ASSETS } from "@richesses-espace/game";
import { getResourceRightsHolders } from "./resource-rights";

const resourceId = "hydroponic-crops";
const resourceAssets = ASSETS.filter((asset) => asset.resourceId === resourceId);
const assetAt = (share: number) => resourceAssets.find((asset) => asset.sharePercent === share)!.id;
const player = (id: string, assetIds: string[], extra: Partial<{ bankrupt: boolean; mergedIntoId: string | null }> = {}) => ({
  id,
  name: id.toUpperCase(),
  color: id === "p1" ? "#e05f42" : "#3784a6",
  assetIds,
  bankrupt: false,
  mergedIntoId: null,
  ...extra
});

describe("resource rights holders", () => {
  it("uses the exact 30 percent threshold across every concession of a resource", () => {
    const holders = getResourceRightsHolders([
      player("p1", [assetAt(30)]),
      player("p2", [assetAt(25), assetAt(10)])
    ], resourceId);

    expect(holders.map(({ id, share }) => ({ id, share }))).toEqual([
      { id: "p1", share: 30 },
      { id: "p2", share: 35 }
    ]);
  });

  it("excludes sub-threshold, bankrupt and merged players", () => {
    const holders = getResourceRightsHolders([
      player("p1", [assetAt(25)]),
      player("p2", [assetAt(30)], { bankrupt: true }),
      player("p3", [assetAt(30)], { mergedIntoId: "p1" })
    ], resourceId);

    expect(holders).toEqual([]);
  });
});

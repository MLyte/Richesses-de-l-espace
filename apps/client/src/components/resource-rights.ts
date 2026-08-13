import { ASSETS } from "@richesses-espace/game";
import type { PublicPlayerView } from "@richesses-espace/protocol";

export interface ResourceRightsHolder {
  id: string;
  name: string;
  color: string;
  share: number;
}

type RightsPlayer = Pick<PublicPlayerView, "id" | "name" | "color" | "assetIds" | "bankrupt" | "mergedIntoId">;

const assetsById = new Map(ASSETS.map((asset) => [asset.id, asset]));

export function getResourceRightsHolders(players: readonly RightsPlayer[], resourceId: string | null): ResourceRightsHolder[] {
  if (!resourceId) return [];
  return players.flatMap((player) => {
    if (player.bankrupt || player.mergedIntoId) return [];
    const share = player.assetIds.reduce((total, assetId) => {
      const asset = assetsById.get(assetId);
      return total + (asset?.resourceId === resourceId ? asset.sharePercent : 0);
    }, 0);
    return share >= 30 ? [{ id: player.id, name: player.name, color: player.color, share }] : [];
  });
}

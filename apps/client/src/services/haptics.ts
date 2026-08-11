import type { GameEvent } from "@richesses-espace/game";

function vibrate(pattern: number | number[]) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  navigator.vibrate(pattern);
}

export function playEventHaptic(event: GameEvent, playerId: string | null) {
  if (!playerId) return;
  const involved = event.playerId === playerId || event.data?.payerId === playerId || event.data?.recipientId === playerId;
  if (!involved) return;

  if (event.type === "dice_rolled") vibrate(35);
  else if (event.type === "asset_purchased") vibrate([28, 45, 42]);
  else if (event.type === "payment_due") vibrate([60, 45, 60]);
  else if (event.type === "payment_completed") vibrate([26, 35, 26]);
  else if (event.type === "space_landed") vibrate(22);
  else if (event.type === "dividend_received") vibrate([24, 30, 24, 30, 42]);
  else if (event.type === "customs_applied" || event.type === "turn_skipped") vibrate([70, 45, 70]);
}

export function playErrorHaptic() { vibrate([75, 45, 75]); }

import { describe, expect, it } from "vitest";
import { setPlayerReady, startGame } from "@richesses-espace/game";
import { hydrateRoom, RoomStore, serializeRoom } from "./room-store";

describe("robot room persistence", () => {
  it("draws distinct available names for a full table of robots", () => {
    const store = new RoomStore();
    const { room } = store.create("MOBILE_ONLY");
    store.join(room.state.code, "Aline", "#e05f42", "cat");

    const botNames = Array.from({ length: 5 }, () => {
      const botId = store.addBot(room, "BALANCED");
      return room.state.players.find((player) => player.id === botId)!.name;
    });

    expect(new Set(botNames).size).toBe(5);
    expect(botNames.every((name) => ["Nova", "Vega", "Orion", "Lyra", "Atlas", "Pulsar", "Sirius", "Kepler", "Astra", "Cosmos"].includes(name))).toBe(true);
  });

  it("persists robot profiles without persisting transient thinking state", () => {
    const store = new RoomStore();
    const { room } = store.create("MOBILE_ONLY");
    const human = store.join(room.state.code, "Aline", "#e05f42", "cat");
    const botId = store.addBot(room, "AMBITIOUS");
    room.botThinkingPlayerId = botId;
    room.state = setPlayerReady(room.state, human.playerId, true);
    room.state = startGame(room.state);

    const stored = serializeRoom(room);
    expect(stored).not.toHaveProperty("botThinkingPlayerId");
    expect(stored.bots).toEqual({ [botId]: "AMBITIOUS" });

    const restored = hydrateRoom(stored);
    expect(restored.botThinkingPlayerId).toBeNull();
    expect(restored.bots[botId]).toBe("AMBITIOUS");
    expect(restored.state.players.find((player) => player.id === botId)?.connected).toBe(true);
    expect(restored.state.players.find((player) => player.id === human.playerId)?.connected).toBe(false);
    expect(restored.state.phase).toBe("PAUSED");
    expect(restored.state.pausePlayerId).toBe(human.playerId);
  });

  it("hydrates legacy rooms without bot metadata as human-only rooms", () => {
    const store = new RoomStore();
    const { room } = store.create();
    const human = store.join(room.state.code, "Aline", "#e05f42", "cat");
    const stored = serializeRoom(room);
    delete stored.bots;

    const restored = hydrateRoom(stored);
    expect(restored.bots).toEqual({});
    expect(restored.state.players.find((player) => player.id === human.playerId)?.connected).toBe(false);
  });
});

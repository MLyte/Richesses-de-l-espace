import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";

const audio = vi.hoisted(() => ({
  cancelPendingTurnStart: vi.fn(),
  playEventSound: vi.fn(),
  playMoveStep: vi.fn(),
  playTurnStart: vi.fn(),
  prepareAudioForForeground: vi.fn(),
  setActionReminder: vi.fn(),
  suspendAudioForBackground: vi.fn()
}));

vi.mock("../services/audio", () => audio);
vi.mock("../services/haptics", () => ({ playErrorHaptic: vi.fn(), playEventHaptic: vi.fn() }));

import { useGameStore } from "./game";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => { values.delete(key); },
    setItem: (key, value) => { values.set(key, value); }
  };
}

describe("game app lifecycle", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    const localStorage = memoryStorage();
    vi.stubGlobal("window", {
      localStorage,
      location: { origin: "https://example.test" },
      addEventListener: vi.fn(),
      setTimeout: vi.fn(() => 1),
      clearTimeout: vi.fn()
    });
    vi.stubGlobal("localStorage", localStorage);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("disconnects a network player in background and reconnects on return", () => {
    const store = useGameStore();
    const socket = {
      connected: true,
      disconnect: vi.fn(function (this: { connected: boolean }) { this.connected = false; }),
      connect: vi.fn(function (this: { connected: boolean }) { this.connected = true; })
    };
    store.role = "player";
    store.sessionToken = "player-token";
    store.socket = socket as never;

    store.handleAppBackground();
    store.handleAppBackground();
    expect(audio.suspendAudioForBackground).toHaveBeenCalledTimes(2);
    expect(socket.disconnect).toHaveBeenCalledOnce();
    expect(store.appBackgrounded).toBe(true);

    store.handleAppForeground();
    expect(audio.prepareAudioForForeground).toHaveBeenCalledOnce();
    expect(socket.connect).toHaveBeenCalledOnce();
    expect(store.appBackgrounded).toBe(false);
  });

  it("pauses a solo game locally and leaves resumption to the player", async () => {
    const store = useGameStore();
    store.localGame = true;
    await store.join("LOCAL", "Nova", "#e05f42", "cat", 1);
    const phaseBeforePause = store.game?.phase;
    expect(phaseBeforePause).not.toBe("PAUSED");

    store.handleAppBackground();
    expect(store.game?.phase).toBe("PAUSED");

    store.handleAppForeground();
    expect(store.game?.phase).toBe("PAUSED");

    await store.resumeGame();
    expect(store.game?.phase).toBe(phaseBeforePause);
  });
});

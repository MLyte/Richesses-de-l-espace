import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type Listener = () => void;

class ListenerRegistry {
  readonly listeners = new Map<string, Listener[]>();

  addEventListener(type: string, listener: Listener): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

const audioStats = {
  mayResume: false,
  oscillatorsStarted: 0,
  buffersStarted: 0,
  sourcesStopped: 0
};

const audioParam = () => ({
  value: 0,
  setValueAtTime: vi.fn(),
  exponentialRampToValueAtTime: vi.fn(),
  cancelScheduledValues: vi.fn()
});

function connectable<T extends object>(extra: T): T & { connect: (destination: unknown) => unknown } {
  return Object.assign(extra, { connect: (destination: unknown) => destination });
}

class MockAudioContext {
  state: AudioContextState = "suspended";
  currentTime = 0;
  sampleRate = 8_000;
  destination = {};

  async resume(): Promise<void> {
    if (!audioStats.mayResume) throw new Error("user gesture required");
    this.state = "running";
  }

  createGain() {
    return connectable({ gain: audioParam() });
  }

  createOscillator() {
    return connectable({
      type: "sine",
      frequency: audioParam(),
      start: () => { audioStats.oscillatorsStarted += 1; },
      stop: () => { audioStats.sourcesStopped += 1; }
    });
  }

  createBufferSource() {
    return connectable({
      buffer: null,
      loop: false,
      start: () => { audioStats.buffersStarted += 1; },
      stop: () => { audioStats.sourcesStopped += 1; }
    });
  }

  createBiquadFilter() {
    return connectable({ type: "lowpass", frequency: audioParam(), Q: audioParam() });
  }

  createBuffer(_channels: number, length: number) {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
}

async function settleAudioPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("mobile audio lifecycle", () => {
  let windowEvents: ListenerRegistry;
  let documentEvents: ListenerRegistry;

  beforeEach(() => {
    vi.resetModules();
    vi.doMock("vue", () => ({ ref: <T>(value: T) => ({ value }) }));
    audioStats.mayResume = false;
    audioStats.oscillatorsStarted = 0;
    audioStats.buffersStarted = 0;
    audioStats.sourcesStopped = 0;
    windowEvents = new ListenerRegistry();
    documentEvents = new ListenerRegistry();
    vi.stubGlobal("AudioContext", MockAudioContext);
    vi.stubGlobal("localStorage", { getItem: vi.fn(() => null), setItem: vi.fn() });
    vi.stubGlobal("window", { addEventListener: windowEvents.addEventListener.bind(windowEvents) });
    vi.stubGlobal("document", {
      visibilityState: "visible",
      addEventListener: documentEvents.addEventListener.bind(documentEvents)
    });
  });

  afterEach(() => vi.unstubAllGlobals());

  it("retries a requested permanent reminder on the first mobile gesture", async () => {
    const audio = await import("./audio");
    audio.installAudioLifecycle();
    audio.setActionReminder(true);
    await settleAudioPromises();

    expect(audioStats.oscillatorsStarted).toBe(0);
    expect(audioStats.buffersStarted).toBe(0);

    audioStats.mayResume = true;
    windowEvents.emit("pointerdown");
    await settleAudioPromises();

    expect(audioStats.oscillatorsStarted).toBe(3);
    expect(audioStats.buffersStarted).toBe(1);

    audio.setActionReminder(true);
    expect(audioStats.oscillatorsStarted).toBe(3);
    expect(audioStats.buffersStarted).toBe(1);

    audio.setActionReminder(false);
    expect(audioStats.sourcesStopped).toBe(4);
  });

  it("plays a queued beginning-of-turn cue after audio becomes available", async () => {
    const audio = await import("./audio");
    audio.installAudioLifecycle();
    audio.playTurnStart();
    await settleAudioPromises();

    audioStats.mayResume = true;
    windowEvents.emit("touchend");
    await settleAudioPromises();

    expect(audioStats.oscillatorsStarted).toBe(3);
    expect(audioStats.buffersStarted).toBe(1);
  });

  it("does not play a queued cue after that player's turn has ended", async () => {
    const audio = await import("./audio");
    audio.installAudioLifecycle();
    audio.playTurnStart();
    audio.cancelPendingTurnStart();

    audioStats.mayResume = true;
    windowEvents.emit("pointerdown");
    await settleAudioPromises();

    expect(audioStats.oscillatorsStarted).toBe(0);
    expect(audioStats.buffersStarted).toBe(0);
  });
});

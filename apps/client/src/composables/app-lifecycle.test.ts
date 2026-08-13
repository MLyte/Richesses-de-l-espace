import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startAppLifecycle } from "./app-lifecycle";

type Listener = () => void;

class ListenerRegistry {
  readonly listeners = new Map<string, Set<Listener>>();

  addEventListener(type: string, listener: Listener): void {
    const listeners = this.listeners.get(type) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: Listener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) listener();
  }
}

describe("application lifecycle", () => {
  let windowEvents: ListenerRegistry;
  let documentEvents: ListenerRegistry;
  let documentMock: { visibilityState: DocumentVisibilityState; addEventListener: ListenerRegistry["addEventListener"]; removeEventListener: ListenerRegistry["removeEventListener"] };

  beforeEach(() => {
    windowEvents = new ListenerRegistry();
    documentEvents = new ListenerRegistry();
    documentMock = {
      visibilityState: "visible",
      addEventListener: documentEvents.addEventListener.bind(documentEvents),
      removeEventListener: documentEvents.removeEventListener.bind(documentEvents)
    };
    vi.stubGlobal("window", {
      addEventListener: windowEvents.addEventListener.bind(windowEvents),
      removeEventListener: windowEvents.removeEventListener.bind(windowEvents)
    });
    vi.stubGlobal("document", documentMock);
  });

  afterEach(() => vi.unstubAllGlobals());

  it("deduplicates visibility and page lifecycle events", () => {
    const onBackground = vi.fn();
    const onForeground = vi.fn();
    const stop = startAppLifecycle({ onBackground, onForeground });

    documentMock.visibilityState = "hidden";
    documentEvents.emit("visibilitychange");
    windowEvents.emit("pagehide");
    expect(onBackground).toHaveBeenCalledTimes(1);

    documentMock.visibilityState = "visible";
    documentEvents.emit("visibilitychange");
    windowEvents.emit("pageshow");
    expect(onForeground).toHaveBeenCalledTimes(1);

    stop();
    windowEvents.emit("pagehide");
    expect(onBackground).toHaveBeenCalledTimes(1);
  });

  it("pauses immediately when installed into an already hidden page", () => {
    documentMock.visibilityState = "hidden";
    const onBackground = vi.fn();

    startAppLifecycle({ onBackground, onForeground: vi.fn() });

    expect(onBackground).toHaveBeenCalledOnce();
  });
});

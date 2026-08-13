import { describe, expect, it, vi } from "vitest";
import { startViewportSync, viewportHeight, type ViewportEventSource, type ViewportWindowLike } from "./viewport";

class FakeEventSource implements ViewportEventSource {
  listeners = new Map<string, Set<EventListener>>();

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  dispatch(type: string): void {
    this.listeners.get(type)?.forEach((listener) => listener(new Event(type)));
  }
}

function createWindow(): ViewportWindowLike & FakeEventSource {
  const source = new FakeEventSource() as ViewportWindowLike & FakeEventSource;
  source.innerHeight = 844;
  source.visualViewport = Object.assign(new FakeEventSource(), { height: 700 });
  source.requestAnimationFrame = (callback) => { callback(0); return 1; };
  source.cancelAnimationFrame = vi.fn();
  return source;
}

describe("mobile viewport synchronization", () => {
  it("prefers the visual viewport and falls back to the layout viewport", () => {
    expect(viewportHeight({ innerHeight: 844, visualViewport: { height: 701.255 } as never })).toBe(701.26);
    expect(viewportHeight({ innerHeight: 844, visualViewport: null })).toBe(844);
  });

  it("updates the CSS contract from window and visual viewport changes", () => {
    const windowLike = createWindow();
    const setProperty = vi.fn();
    const removeProperty = vi.fn();
    const stop = startViewportSync(windowLike, { style: { setProperty, removeProperty } });

    expect(setProperty).toHaveBeenLastCalledWith("--app-viewport-height", "700px");
    windowLike.visualViewport!.height = 612;
    (windowLike.visualViewport as unknown as FakeEventSource).dispatch("resize");
    expect(setProperty).toHaveBeenLastCalledWith("--app-viewport-height", "612px");

    stop();
    expect(removeProperty).toHaveBeenCalledWith("--app-viewport-height");
    expect(windowLike.listeners.get("resize")?.size).toBe(0);
    expect((windowLike.visualViewport as unknown as FakeEventSource).listeners.get("scroll")?.size).toBe(0);
  });
});

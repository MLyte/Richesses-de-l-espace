import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_MOBILE_TOAST_DURATION,
  MIN_MOBILE_TOAST_DURATION,
  createMobileToastQueue,
  mobileToastDuration,
  type MobileToastQueueSnapshot
} from "./mobile-toast-queue";

afterEach(() => vi.useRealTimers());

describe("mobile toast queue", () => {
  it("keeps the current message for its full reading time before showing the next one", () => {
    vi.useFakeTimers();
    let state: MobileToastQueueSnapshot = { current: null, pendingCount: 0 };
    const queue = createMobileToastQueue((snapshot) => { state = snapshot; });
    const first = { key: "event:1", message: "Premier événement important", kind: "event" as const };
    const second = { key: "event:2", message: "Deuxième événement", kind: "event" as const };

    queue.enqueue(first);
    queue.enqueue(second);

    expect(state).toEqual({ current: first, pendingCount: 1 });
    vi.advanceTimersByTime(mobileToastDuration(first.message) - 1);
    expect(state.current).toEqual(first);
    vi.advanceTimersByTime(1);
    expect(state).toEqual({ current: second, pendingCount: 0 });
    queue.dispose();
  });

  it("prioritizes events over queued turn notices and keeps only the latest queued turn", () => {
    vi.useFakeTimers();
    let state: MobileToastQueueSnapshot = { current: null, pendingCount: 0 };
    const queue = createMobileToastQueue((snapshot) => { state = snapshot; });

    queue.enqueue({ key: "event:1", message: "Événement en cours", kind: "event" });
    queue.enqueue({ key: "turn:1", message: "Tour de Lyra", kind: "turn" });
    queue.enqueue({ key: "turn:2", message: "Tour d’Orion", kind: "turn" });
    queue.enqueue({ key: "event:2", message: "Paiement reçu", kind: "event" });

    expect(state.pendingCount).toBe(2);
    queue.dismiss();
    expect(state.current?.key).toBe("event:2");
    queue.dismiss();
    expect(state.current?.key).toBe("turn:2");
    queue.dispose();
  });

  it("supports manual dismissal and clamps reading time", () => {
    vi.useFakeTimers();
    let state: MobileToastQueueSnapshot = { current: null, pendingCount: 0 };
    const queue = createMobileToastQueue((snapshot) => { state = snapshot; });

    expect(mobileToastDuration("Court")).toBe(MIN_MOBILE_TOAST_DURATION);
    expect(mobileToastDuration("x".repeat(500))).toBe(MAX_MOBILE_TOAST_DURATION);
    queue.enqueue({ key: "event:1", message: "À fermer", kind: "event" });
    queue.dismiss();
    expect(state).toEqual({ current: null, pendingCount: 0 });
    queue.dispose();
  });
});

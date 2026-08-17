import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_MOBILE_NOTICE_HISTORY,
  MAX_MOBILE_TOAST_DURATION,
  MIN_MOBILE_TOAST_DURATION,
  createMobileToastQueue,
  mobileToastDuration,
  type MobileToastQueueSnapshot
} from "./mobile-toast-queue";

const emptyState = (): MobileToastQueueSnapshot => ({ current: null, pendingCount: 0, history: [], unreadCount: 0 });

afterEach(() => vi.useRealTimers());

describe("mobile notification queue", () => {
  it("conserve le message courant pendant son temps de lecture", () => {
    vi.useFakeTimers();
    let state = emptyState();
    const queue = createMobileToastQueue((snapshot) => { state = snapshot; });
    const first = { key: "event:1", message: "Premier événement important", kind: "event" as const };
    const second = { key: "event:2", message: "Deuxième événement", kind: "event" as const };
    queue.enqueue(first);
    queue.enqueue(second);
    expect(state.current?.key).toBe(first.key);
    expect(state.pendingCount).toBe(1);
    expect(state.unreadCount).toBe(2);
    vi.advanceTimersByTime(mobileToastDuration(first.message));
    expect(state.current?.key).toBe(second.key);
    queue.dispose();
  });

  it("remplace les anciens tours et groupe les doublons consécutifs", () => {
    vi.useFakeTimers();
    let state = emptyState();
    const queue = createMobileToastQueue((snapshot) => { state = snapshot; });
    queue.enqueue({ key: "event:1", message: "Paiement reçu", kind: "event" });
    queue.enqueue({ key: "event:2", message: "Paiement reçu", kind: "event" });
    queue.enqueue({ key: "turn:1", message: "Tour de Lyra", kind: "turn" });
    queue.enqueue({ key: "turn:2", message: "Tour d’Orion", kind: "turn" });
    expect(state.current?.count).toBe(2);
    expect(state.history.filter((notice) => notice.kind === "turn")).toHaveLength(1);
    expect(state.history.find((notice) => notice.kind === "turn")?.key).toBe("turn:2");
    queue.dismiss();
    expect(state.current?.key).toBe("turn:2");
    queue.dispose();
  });

  it("limite l’historique à dix entrées et acquitte le compteur", () => {
    vi.useFakeTimers();
    let state = emptyState();
    const queue = createMobileToastQueue((snapshot) => { state = snapshot; });
    for (let index = 0; index < 14; index += 1) queue.enqueue({ key: `event:${index}`, message: `Événement ${index}`, kind: "event" });
    expect(state.history).toHaveLength(MAX_MOBILE_NOTICE_HISTORY);
    expect(state.unreadCount).toBe(MAX_MOBILE_NOTICE_HISTORY);
    queue.markRead();
    expect(state.unreadCount).toBe(0);
    queue.dispose();
  });

  it("maintient une erreur jusqu’à son acquittement", () => {
    vi.useFakeTimers();
    let state = emptyState();
    const queue = createMobileToastQueue((snapshot) => { state = snapshot; });
    queue.enqueue({ key: "error:1", message: "Commande impossible", kind: "error" });
    vi.advanceTimersByTime(MAX_MOBILE_TOAST_DURATION * 2);
    expect(state.current?.kind).toBe("error");
    queue.dismiss();
    expect(state.current).toBeNull();
    queue.dispose();
  });

  it("borne la durée de lecture", () => {
    expect(mobileToastDuration("Court")).toBe(MIN_MOBILE_TOAST_DURATION);
    expect(mobileToastDuration("x".repeat(500))).toBe(MAX_MOBILE_TOAST_DURATION);
  });
});

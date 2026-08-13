export type MobileToastNotice = {
  key: string;
  message: string;
  kind: "event" | "turn";
};

export type MobileToastQueueSnapshot = {
  current: MobileToastNotice | null;
  pendingCount: number;
};

export const MIN_MOBILE_TOAST_DURATION = 3_200;
export const MAX_MOBILE_TOAST_DURATION = 6_000;

type TimerHandle = ReturnType<typeof globalThis.setTimeout>;
type Schedule = (callback: () => void, duration: number) => TimerHandle;
type Cancel = (handle: TimerHandle) => void;

export function mobileToastDuration(message: string) {
  const readingDuration = 2_200 + message.trim().length * 35;
  return Math.min(MAX_MOBILE_TOAST_DURATION, Math.max(MIN_MOBILE_TOAST_DURATION, readingDuration));
}

export function createMobileToastQueue(
  onChange: (snapshot: MobileToastQueueSnapshot) => void,
  schedule: Schedule = (callback, duration) => globalThis.setTimeout(callback, duration),
  cancel: Cancel = (handle) => globalThis.clearTimeout(handle)
) {
  let current: MobileToastNotice | null = null;
  let pending: MobileToastNotice[] = [];
  let timer: TimerHandle | null = null;
  let disposed = false;

  const snapshot = (): MobileToastQueueSnapshot => ({ current, pendingCount: pending.length });
  const publish = () => onChange(snapshot());
  const clearTimer = () => {
    if (timer === null) return;
    cancel(timer);
    timer = null;
  };
  const showNext = () => {
    clearTimer();
    current = pending.shift() ?? null;
    publish();
    if (current) timer = schedule(showNext, mobileToastDuration(current.message));
  };
  const contains = (key: string) => current?.key === key || pending.some((notice) => notice.key === key);

  return {
    enqueue(notice: MobileToastNotice) {
      if (disposed || !notice.message.trim() || contains(notice.key)) return;

      if (notice.kind === "turn") {
        pending = pending.filter((item) => item.kind !== "turn");
        pending.push(notice);
      } else {
        const nextTurnIndex = pending.findIndex((item) => item.kind === "turn");
        if (nextTurnIndex === -1) pending.push(notice);
        else pending.splice(nextTurnIndex, 0, notice);
      }

      if (!current) showNext();
      else publish();
    },
    dismiss() {
      if (disposed) return;
      showNext();
    },
    snapshot,
    dispose() {
      disposed = true;
      clearTimer();
      current = null;
      pending = [];
    }
  };
}

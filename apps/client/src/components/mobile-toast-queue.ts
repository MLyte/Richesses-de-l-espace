export type MobileNoticeKind = "event" | "turn" | "error";

export type MobileToastNotice = {
  key: string;
  message: string;
  kind: MobileNoticeKind;
  count?: number;
};

export type MobileToastQueueSnapshot = {
  current: MobileToastNotice | null;
  pendingCount: number;
  history: MobileToastNotice[];
  unreadCount: number;
};

export const MIN_MOBILE_TOAST_DURATION = 3_200;
export const MAX_MOBILE_TOAST_DURATION = 6_000;
export const MAX_MOBILE_NOTICE_HISTORY = 10;

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
  let history: MobileToastNotice[] = [];
  let unreadCount = 0;
  let timer: TimerHandle | null = null;
  let disposed = false;

  const snapshot = (): MobileToastQueueSnapshot => ({ current, pendingCount: pending.length, history: [...history], unreadCount });
  const publish = () => onChange(snapshot());
  const clearTimer = () => {
    if (timer === null) return;
    cancel(timer);
    timer = null;
  };
  const scheduleCurrent = () => {
    clearTimer();
    if (current && current.kind !== "error") timer = schedule(showNext, mobileToastDuration(current.message));
  };
  const showNext = () => {
    clearTimer();
    current = pending.shift() ?? null;
    publish();
    scheduleCurrent();
  };
  const contains = (key: string) => current?.key === key || pending.some((notice) => notice.key === key);
  const addToHistory = (notice: MobileToastNotice) => {
    if (notice.kind === "turn") history = history.filter((item) => item.kind !== "turn");
    const previous = history[0];
    if (previous && previous.kind === notice.kind && previous.message === notice.message) {
      history[0] = { ...notice, count: (previous.count ?? 1) + 1 };
    } else {
      history.unshift({ ...notice, count: notice.count ?? 1 });
      history = history.slice(0, MAX_MOBILE_NOTICE_HISTORY);
    }
    unreadCount = Math.min(MAX_MOBILE_NOTICE_HISTORY, unreadCount + 1);
  };

  return {
    enqueue(notice: MobileToastNotice) {
      if (disposed || !notice.message.trim() || contains(notice.key)) return;
      addToHistory(notice);

      if (current?.kind === notice.kind && current.message === notice.message) {
        current = { ...notice, count: (current.count ?? 1) + 1 };
        scheduleCurrent();
        publish();
        return;
      }

      if (notice.kind === "error") {
        if (current) pending.unshift(current);
        current = notice;
        scheduleCurrent();
        publish();
        return;
      }

      if (notice.kind === "turn") {
        pending = pending.filter((item) => item.kind !== "turn");
        if (current?.kind === "turn") {
          current = notice;
          scheduleCurrent();
          publish();
          return;
        }
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
    markRead() {
      if (disposed || unreadCount === 0) return;
      unreadCount = 0;
      publish();
    },
    snapshot,
    dispose() {
      disposed = true;
      clearTimer();
      current = null;
      pending = [];
      history = [];
      unreadCount = 0;
    }
  };
}

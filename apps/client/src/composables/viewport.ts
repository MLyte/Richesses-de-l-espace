export interface ViewportEventSource {
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

export interface VisualViewportLike extends ViewportEventSource {
  height: number;
}

export interface ViewportWindowLike extends ViewportEventSource {
  innerHeight: number;
  visualViewport?: VisualViewportLike | null;
  requestAnimationFrame(callback: FrameRequestCallback): number;
  cancelAnimationFrame(handle: number): void;
}

export interface ViewportRootLike {
  style: Pick<CSSStyleDeclaration, "setProperty" | "removeProperty">;
}

export function viewportHeight(windowLike: Pick<ViewportWindowLike, "innerHeight" | "visualViewport">): number {
  const measuredHeight = windowLike.visualViewport?.height ?? windowLike.innerHeight;
  return Math.max(0, Math.round(measuredHeight * 100) / 100);
}

export function startViewportSync(
  windowLike: ViewportWindowLike = window,
  root: ViewportRootLike = document.documentElement
): () => void {
  let frame: number | null = null;

  const commit = (): void => {
    frame = null;
    root.style.setProperty("--app-viewport-height", `${viewportHeight(windowLike)}px`);
  };

  const schedule: EventListener = (): void => {
    if (frame !== null) return;
    frame = windowLike.requestAnimationFrame(commit);
  };

  windowLike.addEventListener("resize", schedule);
  windowLike.addEventListener("orientationchange", schedule);
  windowLike.visualViewport?.addEventListener("resize", schedule);
  windowLike.visualViewport?.addEventListener("scroll", schedule);
  commit();

  return () => {
    windowLike.removeEventListener("resize", schedule);
    windowLike.removeEventListener("orientationchange", schedule);
    windowLike.visualViewport?.removeEventListener("resize", schedule);
    windowLike.visualViewport?.removeEventListener("scroll", schedule);
    if (frame !== null) windowLike.cancelAnimationFrame(frame);
    root.style.removeProperty("--app-viewport-height");
  };
}

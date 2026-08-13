export interface AppLifecycleCallbacks {
  onBackground: () => void;
  onForeground: () => void;
}

/**
 * Normalise les événements mobiles : Android privilégie visibilitychange,
 * tandis que Safari/iOS peut émettre pagehide/pageshow autour d'un verrouillage.
 */
export function startAppLifecycle(callbacks: AppLifecycleCallbacks): () => void {
  let backgrounded = false;

  const enterBackground = (): void => {
    if (backgrounded) return;
    backgrounded = true;
    callbacks.onBackground();
  };
  const enterForeground = (): void => {
    if (!backgrounded) return;
    backgrounded = false;
    callbacks.onForeground();
  };
  const syncVisibility = (): void => {
    if (document.visibilityState === "hidden") enterBackground();
    else enterForeground();
  };

  document.addEventListener("visibilitychange", syncVisibility);
  window.addEventListener("pagehide", enterBackground);
  window.addEventListener("pageshow", enterForeground);
  syncVisibility();

  return () => {
    document.removeEventListener("visibilitychange", syncVisibility);
    window.removeEventListener("pagehide", enterBackground);
    window.removeEventListener("pageshow", enterForeground);
  };
}

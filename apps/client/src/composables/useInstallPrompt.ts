import { computed, onBeforeUnmount, onMounted, ref } from "vue";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

type NavigatorWithStandalone = Navigator & { standalone?: boolean };

export function useInstallPrompt() {
  const promptEvent = ref<BeforeInstallPromptEvent | null>(null);
  const standalone = ref(false);
  let displayMode: MediaQueryList | undefined;

  const syncDisplayMode = (): void => {
    standalone.value = Boolean(displayMode?.matches || (navigator as NavigatorWithStandalone).standalone);
  };
  const capturePrompt = (event: Event): void => {
    event.preventDefault();
    promptEvent.value = event as BeforeInstallPromptEvent;
  };
  const clearPrompt = (): void => {
    promptEvent.value = null;
    syncDisplayMode();
  };

  onMounted(() => {
    displayMode = window.matchMedia("(display-mode: standalone)");
    syncDisplayMode();
    displayMode.addEventListener("change", syncDisplayMode);
    window.addEventListener("beforeinstallprompt", capturePrompt);
    window.addEventListener("appinstalled", clearPrompt);
  });

  onBeforeUnmount(() => {
    displayMode?.removeEventListener("change", syncDisplayMode);
    window.removeEventListener("beforeinstallprompt", capturePrompt);
    window.removeEventListener("appinstalled", clearPrompt);
  });

  async function install(): Promise<void> {
    if (!promptEvent.value) return;
    const event = promptEvent.value;
    await event.prompt();
    await event.userChoice;
    promptEvent.value = null;
  }

  return {
    canInstall: computed(() => !standalone.value && promptEvent.value !== null),
    showInstallHint: computed(() => !standalone.value),
    install
  };
}

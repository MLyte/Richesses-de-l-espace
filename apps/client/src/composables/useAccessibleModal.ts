import { nextTick, onBeforeUnmount, watch, type Ref } from "vue";

const focusableSelector = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

type AccessibleModalOptions = {
  initialFocus?: "first-control" | "container";
};

export function useAccessibleModal(
  open: Ref<boolean>,
  container: Ref<HTMLElement | null>,
  close: () => void,
  options: AccessibleModalOptions = {}
) {
  let opener: HTMLElement | null = null;

  const stop = watch(open, async (isOpen) => {
    if (isOpen) {
      opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      await nextTick();
      const firstControl = container.value?.querySelector<HTMLElement>(focusableSelector);
      const initialFocus = options.initialFocus === "container" ? container.value : firstControl ?? container.value;
      initialFocus?.focus({ preventScroll: true });
      return;
    }
    opener?.focus();
    opener = null;
  });

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab" || !container.value) return;

    const controls = [...container.value.querySelectorAll<HTMLElement>(focusableSelector)]
      .filter((element) => element.offsetParent !== null);
    if (!controls.length) {
      event.preventDefault();
      container.value.focus();
      return;
    }
    const first = controls[0]!;
    const last = controls.at(-1)!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  onBeforeUnmount(stop);
  return { onKeydown };
}

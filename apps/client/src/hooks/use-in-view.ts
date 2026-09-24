import { useEffect, useRef } from "react";

// Calls `onVisible` when the returned element scrolls into view
export function useOnVisible<T extends HTMLElement>(
  onVisible: () => void,
  enabled: boolean,
) {
  const ref = useRef<T>(null);
  const callback = useRef(onVisible);
  callback.current = onVisible;

  useEffect(() => {
    const element = ref.current;
    if (!element || !enabled) {
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          callback.current();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [enabled]);

  return ref;
}

import { useLayoutEffect, type RefObject } from "react";
import { animate, stagger } from "animejs";

/** Animate mounted content, including lazy pages; never transform fixed-overlay ancestors. */
export function useReveal<T extends HTMLElement>(
  ref: RefObject<T | null>,
  key: unknown,
  selector?: string,
) {
  useLayoutEffect(() => {
    const root = ref.current;
    if (!root) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const targets = selector
      ? [...root.querySelectorAll<HTMLElement>(selector)]
      : [root];
    let animation: ReturnType<typeof animate> | undefined;
    const sync = () => {
      animation?.revert();
      animation = undefined;
      if (!media.matches && targets.length)
        animation = animate(targets, {
          opacity: [0, 1],
          translateY: [12, 0],
          duration: 420,
          delay: stagger(45, { start: 20 }),
          ease: "outCubic",
          // Release inline transforms so CSS hover/focus transitions can take over.
          onComplete: () => {
            animation?.revert();
          },
        });
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      animation?.revert();
    };
  }, [ref, key, selector]);
}

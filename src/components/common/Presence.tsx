import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { animate } from "animejs";

/** Retain content for its exit, and cancel that exit if it is reopened. */
export default function Presence({
  show,
  children,
  className,
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
}) {
  const [retained, setRetained] = useState(show);
  const previous = useRef(children);
  const element = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (show) {
      previous.current = children;
      setRetained(true);
    }
  }, [show, children]);
  useLayoutEffect(() => {
    const host = element.current;
    if (!host) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let animation: ReturnType<typeof animate> | undefined;
    const sync = () => {
      animation?.revert();
      if (media.matches) {
        if (!show) setRetained(false);
        return;
      }
      animation = animate(host, {
        opacity: show ? [0, 1] : [1, 0],
        duration: show ? 200 : 160,
        ease: "outQuad",
        onComplete: () => {
          if (!show) setRetained(false);
        },
      });
    };
    sync();
    media.addEventListener("change", sync);
    return () => {
      media.removeEventListener("change", sync);
      animation?.revert();
    };
  }, [show]);
  if (!show && !retained) return null;
  return (
    <div
      ref={element}
      className={className}
      inert={!show}
      aria-hidden={!show || undefined}
    >
      {show ? children : previous.current}
    </div>
  );
}

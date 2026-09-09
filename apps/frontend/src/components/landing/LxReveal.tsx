"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Wraps children in a .lx-reveal element and adds .lx-reveal-in when it
 * scrolls into view (once). With reduced motion or no IntersectionObserver,
 * content is shown immediately via CSS fallbacks.
 */
export function LxReveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Stagger delay in milliseconds. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || !("IntersectionObserver" in window)) {
      el.classList.add("lx-reveal-in");
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add("lx-reveal-in");
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`lx-reveal${className ? ` ${className}` : ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}

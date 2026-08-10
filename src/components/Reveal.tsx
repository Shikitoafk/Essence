"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Settles its children into place when they scroll into view.
 *
 * The rule this is built around: content must never depend on JavaScript to
 * become visible. So it renders *visible*, and only hides itself once mounted,
 * on the client, after confirming the element is below the fold — where the
 * reader cannot see it happen. A blocked bundle or a failed hydration then
 * costs the page its animation and nothing else.
 *
 * Anything above the fold should use the CSS-only `.rise` class instead. It
 * cannot be hidden this way without a visible flash, and a keyframe animation
 * needs no script to finish.
 *
 * The observer disconnects after firing. These are decorative entrances, and an
 * element that re-animates every time it re-enters the viewport reads as a page
 * that will not sit still.
 */
export default function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  as?: ElementType;
  /** Seconds to stagger this element behind its siblings. */
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (still || typeof IntersectionObserver === "undefined") return;

    // Already on screen, or close enough that hiding it now would read as a
    // flicker rather than an entrance. Leave it exactly as it rendered.
    if (node.getBoundingClientRect().top < window.innerHeight * 0.92) return;

    node.dataset.armed = "true";

    // Fires slightly before the element is fully on screen, so the motion has
    // finished by the time it is where the eye lands.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        node.dataset.shown = "true";
        observer.disconnect();
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={`reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
}

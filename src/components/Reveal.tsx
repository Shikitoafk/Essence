"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";

/**
 * Settles its children into place when they scroll into view.
 *
 * The animation lives in CSS (`.reveal` in globals.css); this only decides
 * *when* by flipping `data-shown`. Keeping it that way means a reader who has
 * asked their system for reduced motion gets the finished state from the first
 * paint — the media query wins and there is no transition to suppress.
 *
 * The observer disconnects after firing. These are decorative entrances, and an
 * element that re-animates every time it re-enters the viewport reads as a page
 * that will not sit still.
 */
/**
 * Calls off the layout's dead-man's switch.
 *
 * The inline script hides the page and arms a timer to un-hide it. Reaching
 * here proves React mounted, so the timer is cancelled and the entrances run.
 * If hydration had failed instead — a blocked bundle, a throwing effect — the
 * timer would fire and the reader would get an unanimated page rather than an
 * empty one.
 */
let switchDisarmed = false;

function disarmUnhideTimer() {
  if (switchDisarmed) return;
  switchDisarmed = true;

  const w = window as Window & { __essenceUnhide?: ReturnType<typeof setTimeout> };
  if (w.__essenceUnhide !== undefined) {
    clearTimeout(w.__essenceUnhide);
    delete w.__essenceUnhide;
  }
}

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

    disarmUnhideTimer();

    // No observer means no way to know when this scrolls in, so it simply
    // stays put. An un-animated element beats an invisible one.
    if (typeof IntersectionObserver === "undefined") {
      node.dataset.shown = "true";
      return;
    }

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

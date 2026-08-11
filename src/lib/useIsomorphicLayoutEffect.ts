import { useEffect, useLayoutEffect } from "react";

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * Client components are still server-rendered for the initial HTML, and React
 * warns that a layout effect cannot run there. The warning is correct, and the
 * work is genuinely layout work — sizing the draft to its content has to happen
 * before the browser paints, or the editor is visibly seen snapping open.
 *
 * So the effect stays a layout effect wherever layout exists, and degrades to
 * an ordinary one where it doesn't and would never have run anyway.
 */
export const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

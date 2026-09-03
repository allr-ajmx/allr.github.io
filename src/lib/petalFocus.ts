"use client";

/**
 * Which petal the page is currently "about".
 *
 * Static sections declare this with `data-petal` and the header picks them up
 * with an observer. The Bloom cannot: it changes petal continuously as you
 * scroll through it, and the header used to chase that with a MutationObserver
 * on the attribute. Publishing the value directly removes that DOM round-trip
 * — one scroll authority tells the header what it needs to know.
 */

type Listener = () => void;

let current: number | undefined;
const listeners = new Set<Listener>();

export function setFocusedPetal(next: number | undefined) {
  if (current === next) return;
  current = next;
  for (const l of listeners) l();
}

export function subscribeFocusedPetal(l: Listener) {
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function getFocusedPetal() {
  return current;
}

/** The server never has a focused petal; this keeps hydration quiet. */
export function getFocusedPetalServer() {
  return undefined;
}

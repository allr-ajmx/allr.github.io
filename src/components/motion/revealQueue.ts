"use client";

/**
 * Decides when a reveal fires. One handler for every reveal on the page.
 *
 * This is the third attempt, so the reasoning is worth recording.
 *
 * `ScrollTrigger` answers "is it in view?" from positions cached at refresh
 * time. Those go stale whenever layout settles after the refresh — late fonts,
 * a slow first paint — and whole pages of reveals silently never fire.
 *
 * `IntersectionObserver` reads live layout, but delivers asynchronously. Under
 * slow frames an element can enter *and leave* the viewport between two
 * deliveries, and the callback then reports `isIntersecting: false` — so the
 * reveal is skipped for good. That is a one-shot trigger missing its only
 * chance, and it is why reveals were intermittently stuck.
 *
 * A one-shot "have we reached this yet?" question wants neither. It wants a
 * live measurement taken every frame the page moves, which is what this does:
 * one passive scroll listener, rAF-coalesced, reading rects only for the
 * handful of elements still waiting. The list empties as the page is read, so
 * the steady-state cost is a single no-op listener.
 */

type Entry = { el: HTMLElement; fire: () => void };

const pending = new Set<Entry>();
let frame = 0;
let listening = false;

/** Matches the old observer band: fire as soon as it enters an expanded view. */
function reached(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const vh = window.innerHeight || 0;
  return r.top < vh * 1.25 && r.bottom > -vh * 0.1;
}

function flush() {
  frame = 0;
  for (const entry of Array.from(pending)) {
    if (reached(entry.el)) {
      pending.delete(entry);
      entry.fire();
    }
  }
  if (!pending.size) stop();
}

function schedule() {
  if (!frame) frame = requestAnimationFrame(flush);
}

function start() {
  if (listening) return;
  listening = true;
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
}

function stop() {
  if (!listening) return;
  listening = false;
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
}

/** Fires `onReach` once, then forgets the element. Returns an unsubscribe. */
export function whenReached(el: HTMLElement, onReach: () => void) {
  // Above the fold at mount, where no scroll event will ever come.
  if (reached(el)) {
    onReach();
    return () => {};
  }
  const entry: Entry = { el, fire: onReach };
  pending.add(entry);
  start();
  // Late fonts and images move things; re-check once layout has settled.
  if (typeof document !== "undefined" && document.fonts?.ready) {
    document.fonts.ready.then(schedule).catch(() => {});
  }
  return () => {
    pending.delete(entry);
    if (!pending.size) stop();
  };
}

import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

/**
 * Remote-control style navigation.
 *
 * Rather than tracking a manual `selectedIndex`/`row`/`column` per view (which
 * breaks the moment a grid's column count changes with window size), this
 * moves the *real* DOM focus to whichever focusable element is the closest
 * neighbour in the pressed direction, based on actual on-screen geometry.
 *
 * That means:
 *  - It automatically works across totally different layouts (nav bar,
 *    keyboard grid, poster grid, episode list) with zero per-view glue code.
 *  - `:focus-visible` in CSS is all we need for the "highlighted" look.
 *  - Enter/Space on native <button>/<a>/<select> elements already works for
 *    free, courtesy of the browser.
 */

type Direction = "up" | "down" | "left" | "right";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function isVisible(el: HTMLElement): boolean {
  return (
    el.offsetParent !== null &&
    el.getAttribute("aria-hidden") !== "true" &&
    getComputedStyle(el).visibility !== "hidden"
  );
}

function getFocusableElements(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(isVisible);
}

function center(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

/**
 * Scores how good a candidate is as the "next" element in a direction.
 * Lower is better. Returns null if the candidate isn't in that direction at all.
 *
 * The perpendicular offset is weighted more heavily than the distance along
 * the direction of travel, so neighbours that are roughly "in line" (same row
 * for left/right, same column for up/down) are strongly preferred — this is
 * what makes movement feel intuitive in a grid instead of jumping diagonally.
 */
function score(current: DOMRect, candidate: DOMRect, direction: Direction): number | null {
  const a = center(current);
  const b = center(candidate);
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const ALONG = 1;
  const ACROSS = 3;

  switch (direction) {
    case "right":
      return dx > 0 ? dx * ALONG + Math.abs(dy) * ACROSS : null;
    case "left":
      return dx < 0 ? -dx * ALONG + Math.abs(dy) * ACROSS : null;
    case "down":
      return dy > 0 ? dy * ALONG + Math.abs(dx) * ACROSS : null;
    case "up":
      return dy < 0 ? -dy * ALONG + Math.abs(dx) * ACROSS : null;
  }
}

function moveFocus(direction: Direction) {
  const focusable = getFocusableElements();
  const active = document.activeElement as HTMLElement | null;

  if (!active || active === document.body || !focusable.includes(active)) {
    focusable[0]?.focus();
    return;
  }

  const currentRect = active.getBoundingClientRect();

  let best: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const el of focusable) {
    if (el === active) continue;

    const s = score(currentRect, el.getBoundingClientRect(), direction);
    if (s !== null && s < bestScore) {
      bestScore = s;
      best = el;
    }
  }

  best?.focus();
}

/** Focuses the most sensible element when a new screen mounts. */
function focusDefaultTarget() {
  const main = document.querySelector<HTMLElement>(".app-main");
  if (!main) return;

  const preferred = main.querySelector<HTMLElement>("[data-autofocus]");
  const fallback = main.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);

  (preferred ?? fallback)?.focus();
}

export function useSpatialNavigation() {
  const location = useLocation();
  const navigate = useNavigate();

  // Whenever the route changes, make sure something sensible is focused —
  // otherwise the user has no visible "cursor" to start from.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const active = document.activeElement;
      const hasUsableFocus =
        active && active !== document.body && document.body.contains(active) && active.closest(".app-main");

      if (!hasUsableFocus) {
        focusDefaultTarget();
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const active = document.activeElement as HTMLElement | null;
      const isVideoFocused = active?.tagName === "VIDEO";

      switch (e.key) {
        case "ArrowUp":
        case "ArrowDown":
          // Never fight the native <video> element's own keyboard controls,
          // and don't hijack a focused <select>'s native Up/Down behavior.
          if (isVideoFocused || active?.tagName === "SELECT") return;
          e.preventDefault();
          moveFocus(e.key === "ArrowUp" ? "up" : "down");
          break;

        case "ArrowLeft":
        case "ArrowRight":
          if (isVideoFocused) return;
          e.preventDefault();
          moveFocus(e.key === "ArrowLeft" ? "left" : "right");
          break;

        case "Escape":
          // Always goes back, regardless of what currently has focus —
          // this is the remote's "back" button and must never be a no-op.
          e.preventDefault();
          navigate(-1);
          break;

        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate]);
}
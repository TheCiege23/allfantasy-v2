/**
 * AllFantasy Social Share Engine — share tracking (PROMPT 145).
 * Client-side service: fires share_attempt and share_complete to analytics.
 */

import { gtagEvent } from "@/lib/gtag";
import type { ShareTrackMeta } from "./types";

const SHARE_ATTEMPT = "share_attempt";
const SHARE_COMPLETE = "share_complete";

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const key = "af_session_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id =
      (typeof crypto !== "undefined" && crypto?.randomUUID?.()) ||
      `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, id);
    return id;
  } catch {
    return null;
  }
}

function post(event: string, meta: Record<string, unknown>) {
  try {
    fetch("/api/share/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        sessionId: getSessionId(),
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
        meta,
      }),
      keepalive: true,
    });
  } catch {
    // no-op
  }
}

/**
 * Track that the user opened share or chose a destination (attempt).
 */
export function trackShareAttempt(meta: ShareTrackMeta): void {
  post(SHARE_ATTEMPT, meta as unknown as Record<string, unknown>);
}

/**
 * Track that a share action completed (e.g. copy success, or native share closed).
 */
export function trackShareComplete(meta: ShareTrackMeta): void {
  post(SHARE_COMPLETE, meta as unknown as Record<string, unknown>);
  gtagEvent("share", { method: meta.destination, content_type: meta.shareType });
}

/**
 * AllFantasy Social Share Engine client tracking helpers.
 */

import { gtagEvent } from "@/lib/gtag";
import type { ShareTrackMeta } from "./types";

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const key = "af_session_id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const generated =
      (typeof crypto !== "undefined" && crypto?.randomUUID?.()) ||
      `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, generated);
    return generated;
  } catch {
    return null;
  }
}

function post(event: string, meta: ShareTrackMeta) {
  try {
    void fetch("/api/share/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        sessionId: getSessionId(),
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
        referrer: typeof document !== "undefined" ? document.referrer || undefined : undefined,
        meta,
      }),
      keepalive: true,
    });
  } catch {
    // no-op
  }
}

export function trackShareModalOpened(meta: ShareTrackMeta): void {
  post("share_modal_opened", meta);
}

export function trackShareAttempt(meta: ShareTrackMeta): void {
  post("share_attempt", meta);
}

export function trackShareComplete(meta: ShareTrackMeta): void {
  post("share_complete", meta);
  if (meta.destination) {
    gtagEvent("share", {
      method: meta.destination,
      content_type: meta.shareType,
    });
  }
}

export function trackShareFallback(meta: ShareTrackMeta): void {
  post("share_fallback", { ...meta, usedFallback: true });
}

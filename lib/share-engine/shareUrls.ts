/**
 * AllFantasy Social Share Engine — build share and platform URLs (PROMPT 145).
 * Safe for client; no sensitive data in URLs.
 */

import type { SharePayload, ShareDestination } from "./types";

function getOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://allfantasy.ai";
}

/** Build X (Twitter) intent URL. */
export function getXShareUrl(url: string, text: string, maxLen = 200): string {
  const params = new URLSearchParams({
    url,
    text: text.slice(0, maxLen),
  });
  return `https://twitter.com/intent/tweet?${params.toString()}`;
}

/** Build Reddit submit URL. */
export function getRedditShareUrl(url: string, title: string): string {
  const params = new URLSearchParams({
    url,
    title: title.slice(0, 300),
  });
  return `https://www.reddit.com/submit?${params.toString()}`;
}

/** Build mailto for email share. */
export function getEmailShareUrl(
  url: string,
  subject: string,
  body: string
): string {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Build sms: link for SMS share. */
export function getSmsShareUrl(url: string, message: string): string {
  const text = `${message} ${url}`;
  return `sms:?body=${encodeURIComponent(text)}`;
}

/** Discord has no intent URL; copy link is the standard. Returns same url for "open in new tab" copy-paste. */
export function getDiscordShareUrl(url: string): string {
  return url;
}

/**
 * Get platform-specific share URL for a destination.
 * For copy_link, use payload.url directly.
 */
export function getPlatformShareUrl(
  destination: ShareDestination,
  payload: SharePayload,
  options?: { subject?: string; message?: string }
): string {
  const url = payload.url;
  const title = payload.title;
  const description = payload.description ?? "";
  const text = description ? `${title} – ${description}` : title;
  const message = options?.message ?? text;
  const subject = options?.subject ?? title;

  switch (destination) {
    case "copy_link":
      return url;
    case "x":
      return getXShareUrl(url, message);
    case "reddit":
      return getRedditShareUrl(url, message);
    case "email":
      return getEmailShareUrl(url, subject, `${message}\n\n${url}`);
    case "sms":
      return getSmsShareUrl(url, message);
    case "discord":
      return getDiscordShareUrl(url);
    default:
      return url;
  }
}

/**
 * Get the canonical share URL for a payload (already set by caller).
 * Used when opening in new tab for Discord (copy link UX).
 */
export function getShareDisplayUrl(payload: SharePayload): string {
  return payload.url;
}

export { getOrigin };

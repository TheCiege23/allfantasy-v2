import { getSafeMessageMediaUrl } from "./safeMedia"

export function resolveMediaViewerUrl(candidate: string | null | undefined): string | null {
  if (!candidate) return null
  return getSafeMessageMediaUrl(candidate)
}

export function canOpenInMediaViewer(messageType: string): boolean {
  const normalized = String(messageType || "text").toLowerCase()
  return normalized === "image" || normalized === "gif" || normalized === "media"
}

export function getMediaViewerAriaLabel(messageType: string): string {
  const normalized = String(messageType || "media").toLowerCase()
  if (normalized === "gif") return "View GIF"
  if (normalized === "image") return "View image"
  return "View media"
}

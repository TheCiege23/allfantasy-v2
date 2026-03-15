/**
 * Persist avatar URL or clear: PATCH /api/user/profile with avatarUrl.
 * Used after upload (set url) or when user removes image (set null).
 */

export async function setProfileAvatarUrl(url: string | null): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch("/api/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ avatarUrl: url }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: data?.error ?? "Failed to save" }
  return { ok: true }
}

export type UsernameAvailabilityResult =
  | { ok: true; available: true; reason: "ok" | "unchecked"; verified?: boolean }
  | {
      ok: boolean
      available: false
      reason:
        | "taken"
        | "profanity"
        | "length"
        | "charset"
        | "empty"
        | "db_unavailable"
        | "error"
    }

export async function checkUsernameAvailability(
  username: string
): Promise<UsernameAvailabilityResult> {
  const res = await fetch(
    `/api/auth/check-username?username=${encodeURIComponent(username)}`
  )
  const data = (await res.json().catch(() => ({}))) as UsernameAvailabilityResult
  if (
    data &&
    typeof data === "object" &&
    "available" in data &&
    "reason" in data
  ) {
    return data
  }
  return { ok: false, available: false, reason: "error" }
}

export async function suggestUsername(base: string): Promise<string | null> {
  const res = await fetch(
    `/api/auth/suggest-username?base=${encodeURIComponent(base)}`
  )
  const data = (await res.json().catch(() => ({}))) as { suggestion?: string }
  return typeof data?.suggestion === "string" ? data.suggestion : null
}

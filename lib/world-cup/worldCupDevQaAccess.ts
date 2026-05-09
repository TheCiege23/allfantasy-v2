import "server-only"

/**
 * Dev / staging helpers for World Cup QA routes (`/api/dev/world-cup/*`).
 *
 * - Local: allowed when `NODE_ENV === "development"`.
 * - Staging / scripted QA: set `WORLD_CUP_DEV_QA_SECRET` and send `Authorization: Bearer <secret>`.
 * - Production: helpers return 404 unless the secret is set and the bearer matches (avoid accidental exposure).
 */
export function isWorldCupDevQaSecretConfigured(): boolean {
  return Boolean(process.env.WORLD_CUP_DEV_QA_SECRET?.trim())
}

export function verifyWorldCupDevQaRequest(request: Request): boolean {
  if (process.env.NODE_ENV === "development") {
    return true
  }
  const secret = process.env.WORLD_CUP_DEV_QA_SECRET?.trim()
  if (!secret) {
    return false
  }
  const auth = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? ""
  return auth === secret
}

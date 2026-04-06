import { loginUrlWithIntent, safeRedirectPath, signupUrlWithIntent } from "@/lib/auth/auth-intent-resolver"

export const DEFAULT_POST_AUTH_ROUTE = "/dashboard"
export const AUTH_INTENT_STORAGE_KEY = "af_auth_intent"

const SPORTS_APP_INTENTS = new Set(["sports-app", "sports", "webapp", "app"])
const BRACKET_INTENTS = new Set(["bracket", "bracket-challenge", "brackets"])
const LEGACY_INTENTS = new Set(["legacy", "af-legacy"])
const ADMIN_INTENTS = new Set(["admin"])

export interface PostAuthIntentInput {
  callbackUrl?: string | null
  next?: string | null
  returnTo?: string | null
  intent?: string | null
  rememberedIntent?: string | null
  isAdmin?: boolean
  fallback?: string
}

function isSafeInternalPath(value: string | null | undefined): value is string {
  if (!value || typeof value !== "string") return false
  const trimmed = value.trim()
  return trimmed.startsWith("/") && !trimmed.startsWith("//")
}

function resolveIntentAlias(intent: string | null | undefined): string | null {
  if (!intent || typeof intent !== "string") return null
  const normalized = intent.trim().toLowerCase()
  if (SPORTS_APP_INTENTS.has(normalized)) return "/dashboard"
  if (BRACKET_INTENTS.has(normalized)) return "/brackets"
  if (LEGACY_INTENTS.has(normalized)) return "/af-legacy"
  if (ADMIN_INTENTS.has(normalized)) return "/admin"
  return null
}

/** Old bookmarks and emails used `/app` and `/app/home`; canonical hub is `/dashboard`. */
function remapDeprecatedAppRoutes(safe: string): string {
  const q = safe.indexOf("?")
  const path = q === -1 ? safe : safe.slice(0, q)
  const search = q === -1 ? "" : safe.slice(q)
  if (path === "/app" || path === "/app/home") {
    return `/dashboard${search}`
  }
  return safe
}

function normalizeCandidate(
  value: string | null | undefined,
  isAdmin: boolean | undefined
): string | null {
  if (!isSafeInternalPath(value)) return null
  const safe = remapDeprecatedAppRoutes(safeRedirectPath(value))
  if (safe.startsWith("/admin") && isAdmin === false) {
    return DEFAULT_POST_AUTH_ROUTE
  }
  return safe
}

export function resolvePostAuthIntentDestination(input: PostAuthIntentInput): string {
  const isAdmin = input.isAdmin
  const candidates = [
    input.callbackUrl,
    input.next,
    input.returnTo,
    resolveIntentAlias(input.intent),
    input.rememberedIntent,
  ]

  for (const candidate of candidates) {
    const normalized = normalizeCandidate(candidate, isAdmin)
    if (normalized) return normalized
  }

  if (isAdmin === true) return "/admin"
  return normalizeCandidate(input.fallback, isAdmin) ?? DEFAULT_POST_AUTH_ROUTE
}

export function buildLoginHrefWithIntent(redirectPath: string): string {
  return loginUrlWithIntent(redirectPath)
}

export function buildSignupHrefWithIntent(redirectPath: string): string {
  return signupUrlWithIntent(redirectPath)
}

export function rememberAuthIntent(path: string | null | undefined): void {
  if (typeof window === "undefined") return
  const normalized = normalizeCandidate(path, undefined)
  if (!normalized) return
  try {
    window.localStorage.setItem(AUTH_INTENT_STORAGE_KEY, normalized)
  } catch {}
}

export function readRememberedAuthIntent(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.localStorage.getItem(AUTH_INTENT_STORAGE_KEY)
    return normalizeCandidate(raw, undefined)
  } catch {
    return null
  }
}

export function clearRememberedAuthIntent(): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.removeItem(AUTH_INTENT_STORAGE_KEY)
  } catch {}
}

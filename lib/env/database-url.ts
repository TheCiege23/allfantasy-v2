/** Prefer pooled runtime URLs first; use DIRECT / non-pooling only as fallbacks (e.g. local dev). */
const DATABASE_URL_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "DIRECT_URL",
  "POSTGRES_URL_NON_POOLING",
] as const

type DatabaseEnv = Partial<Record<(typeof DATABASE_URL_ENV_KEYS)[number], string | undefined>>
type EnvLike = Record<string, string | undefined>

function normalizeDatabaseUrl(url: string): string {
  try {
    const parsed = new URL(url)

    // Supabase transaction pooler requires PgBouncer-safe Prisma settings.
    if (parsed.hostname.endsWith("pooler.supabase.com") && parsed.port === "6543") {
      if (!parsed.searchParams.has("pgbouncer")) {
        parsed.searchParams.set("pgbouncer", "true")
      }
      if (!parsed.searchParams.has("connection_limit")) {
        parsed.searchParams.set("connection_limit", "1")
      }
      return parsed.toString()
    }

    return url
  } catch {
    return url
  }
}

function hasSupportedPostgresScheme(url: string): boolean {
  return /^(postgres|postgresql):\/\//i.test(url.trim())
}

export function resolveDatabaseUrl(env: DatabaseEnv | EnvLike = process.env): string | null {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = env[key]?.trim()
    if (!value) continue
    if (!hasSupportedPostgresScheme(value)) continue
    return normalizeDatabaseUrl(value)
  }

  return null
}

export function hasDatabaseUrl(env: DatabaseEnv | EnvLike = process.env): boolean {
  return !!resolveDatabaseUrl(env)
}

export function getDatabaseUrlOrThrow(env: DatabaseEnv | EnvLike = process.env): string {
  const url = resolveDatabaseUrl(env)

  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Add it to your local environment and Vercel project settings."
    )
  }

  return url
}

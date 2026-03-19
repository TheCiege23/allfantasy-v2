const DATABASE_URL_ENV_KEYS = [
  "DATABASE_URL",
  "POSTGRES_PRISMA_URL",
  "POSTGRES_URL",
  "POSTGRES_URL_NON_POOLING",
] as const

type DatabaseEnv = Partial<Record<(typeof DATABASE_URL_ENV_KEYS)[number], string | undefined>>
type EnvLike = Record<string, string | undefined>

export function resolveDatabaseUrl(env: DatabaseEnv | EnvLike = process.env): string | null {
  for (const key of DATABASE_URL_ENV_KEYS) {
    const value = env[key]?.trim()
    if (value) return value
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

/**
 * NextAuth accepts NEXTAUTH_SECRET; Auth.js / some hosts also set AUTH_SECRET.
 * Treat either as the signing secret so dashboard and auth agree on configuration.
 */
export function resolveAuthSecret(
  env: Partial<Record<"NEXTAUTH_SECRET" | "AUTH_SECRET", string | undefined>> = process.env
): string | undefined {
  const a = env.NEXTAUTH_SECRET?.trim()
  if (a) return a
  const b = env.AUTH_SECRET?.trim()
  if (b) return b
  return undefined
}

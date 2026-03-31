import type { NextRequest } from 'next/server'

export function requireCronAuth(req: NextRequest, preferredSecretEnv?: string): boolean {
  const authHeader = req.headers.get('authorization') ?? ''
  const provided =
    req.headers.get('x-cron-secret') ??
    req.headers.get('x-admin-secret') ??
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '') ??
    ''

  const cronSecret =
    (preferredSecretEnv ? process.env[preferredSecretEnv] : undefined) ??
    process.env.LEAGUE_CRON_SECRET ??
    process.env.CRON_SECRET
  const adminSecret = process.env.BRACKET_ADMIN_SECRET || process.env.ADMIN_PASSWORD

  return Boolean(
    provided &&
      ((cronSecret && provided === cronSecret) || (adminSecret && provided === adminSecret))
  )
}

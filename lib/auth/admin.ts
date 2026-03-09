export function resolveAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  const allow = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean)
  return allow.includes(email.toLowerCase())
}

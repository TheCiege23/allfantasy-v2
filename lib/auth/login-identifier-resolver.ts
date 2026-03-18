/**
 * Resolves a single login identifier (email, username, or mobile number) to an AppUser id.
 * Used by the credentials provider to support one unified login field.
 */
import { prisma } from "@/lib/prisma"

function normalizePhone(input: string): string {
  const s = input.trim().replace(/[\s()-]/g, "")
  return s.startsWith("+") ? s : "+1" + s
}

function looksLikePhone(input: string): boolean {
  const digits = input.replace(/\D/g, "")
  return digits.length >= 10 && digits.length <= 15
}

/**
 * Find AppUser by login string: email, username, or phone (via UserProfile).
 * Returns the user record or null.
 */
export async function resolveLoginToUser(login: string): Promise<{
  id: string
  email: string
  passwordHash: string | null
  displayName: string | null
  username: string
  avatarUrl: string | null
} | null> {
  // #region agent log
  const _log = (msg: string, data: Record<string, unknown>, hypothesisId: string) => {
    fetch('http://127.0.0.1:7282/ingest/0e682c6b-2c70-4f59-8e9a-ec784a2ad7bb', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'fff6ba' }, body: JSON.stringify({ sessionId: 'fff6ba', location: 'lib/auth/login-identifier-resolver.ts:resolveLoginToUser', message: msg, data, hypothesisId, timestamp: Date.now() }) }).catch(() => {});
  };
  // #endregion
  const trimmed = login.trim()
  if (!trimmed) return null

  const isPhone = looksLikePhone(trimmed)
  // #region agent log
  _log('resolveLoginToUser start', { loginLen: trimmed.length, looksLikePhone: isPhone }, 'H2');
  // #endregion
  if (isPhone) {
    const phone = normalizePhone(trimmed)
    if (!/^\+\d{10,15}$/.test(phone)) return null
    const profile = await prisma.userProfile.findUnique({
      where: { phone },
      select: { userId: true },
    }).catch(() => null)
    if (!profile) return null
    const user = await prisma.appUser.findUnique({
      where: { id: profile.userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        displayName: true,
        username: true,
        avatarUrl: true,
      },
    })
    // #region agent log
    _log('resolveLoginToUser phone path', { found: !!user }, 'H2');
    // #endregion
    return user
  }

  const user = await prisma.appUser.findFirst({
    where: {
      OR: [
        { email: { equals: trimmed, mode: "insensitive" } },
        { username: { equals: trimmed, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      displayName: true,
      username: true,
      avatarUrl: true,
    },
  })
  // #region agent log
  _log('resolveLoginToUser email/username path', { found: !!user }, 'H2');
  // #endregion
  return user
}

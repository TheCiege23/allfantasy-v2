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
  const trimmed = login.trim()
  if (!trimmed) return null

  if (looksLikePhone(trimmed)) {
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
  return user
}

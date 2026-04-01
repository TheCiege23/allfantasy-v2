import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'

import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { adminUnauthorized } from '@/lib/adminAuth'
import { seedCollegePlayers } from '@/lib/devy/CollegePlayerSeedService'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

type SessionUser = {
  id?: string
}

function parseAllowedAdminValues(rawValue: string | undefined): Set<string> {
  return new Set(
    String(rawValue ?? '')
      .split(/[\n\r,;]+/)
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  )
}

async function isAllowedDevAdmin(userId: string | undefined): Promise<boolean> {
  if (!userId) return false

  const user = await prisma.appUser.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      displayName: true,
      email: true,
    },
  })

  if (!user) return false

  const allowed = parseAllowedAdminValues(process.env.DEV_ADMIN_USER_IDS)
  const candidates = [user.id, user.username, user.displayName, user.email]
    .map((value) => String(value ?? '').trim().toLowerCase())
    .filter(Boolean)

  return candidates.some((value) => allowed.has(value))
}

function hasValidAdminSecret(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization') ?? ''
  const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  const headerSecret =
    req.headers.get('x-admin-secret') ?? req.headers.get('x-cron-secret') ?? ''
  const expectedSecrets = [process.env.BRACKET_ADMIN_SECRET, process.env.ADMIN_PASSWORD]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)

  return expectedSecrets.some((secret) => secret === bearer || secret === headerSecret)
}

export async function POST(req: NextRequest) {
  const session = (await getServerSession(authOptions as any)) as { user?: SessionUser } | null
  const sessionUserId = session?.user?.id
  const canUseDevAdmin = await isAllowedDevAdmin(sessionUserId)

  if (!canUseDevAdmin && !hasValidAdminSecret(req)) {
    return adminUnauthorized()
  }

  const body = await req.json().catch(() => ({}))
  const sport = typeof body?.sport === 'string' ? body.sport : 'NCAAF'

  try {
    const result = await seedCollegePlayers({ sport })
    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error) {
    console.error('[admin/seed-college-players]', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'College player seed failed' },
      { status: 500 }
    )
  }
}

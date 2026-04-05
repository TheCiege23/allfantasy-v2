import { NextRequest, NextResponse } from 'next/server'
import { requireEntitlement } from '@/lib/subscription/requireEntitlement'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PUT(req: NextRequest) {
  const ent = await requireEntitlement('pro_autocoach')
  if (typeof ent !== 'string') return ent

  const userId = ent
  let body: { enabled?: boolean }
  try {
    body = (await req.json()) as { enabled?: boolean }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const enabled = body.enabled === true

  await prisma.userProfile.update({
    where: { userId },
    data: { autoCoachGlobalEnabled: enabled },
  })

  return NextResponse.json({
    globalEnabled: enabled,
    updated: 1,
  })
}

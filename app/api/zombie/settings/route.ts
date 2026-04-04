import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { requireCommissionerOnly } from '@/lib/league/permissions'

export const dynamic = 'force-dynamic'

export async function PATCH(req: Request) {
  const session = (await getServerSession(authOptions as never)) as { user?: { id?: string } } | null
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>
  const leagueId = typeof body.leagueId === 'string' ? body.leagueId : null
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 })

  await requireCommissionerOnly(leagueId, userId)

  const z = await prisma.zombieLeague.findUnique({ where: { leagueId } })
  if (!z) return NextResponse.json({ error: 'Zombie league not found' }, { status: 404 })

  const num = (k: string) => (typeof body[k] === 'number' ? (body[k] as number) : undefined)
  const bool = (k: string) => (typeof body[k] === 'boolean' ? (body[k] as boolean) : undefined)

  const row = await prisma.zombieLeague.update({
    where: { id: z.id },
    data: {
      ...(num('weeklyUpdateDay') !== undefined ? { weeklyUpdateDay: num('weeklyUpdateDay') } : {}),
      ...(num('weeklyUpdateHour') !== undefined ? { weeklyUpdateHour: num('weeklyUpdateHour') } : {}),
      ...(bool('weeklyUpdateAutoPost') !== undefined ? { weeklyUpdateAutoPost: bool('weeklyUpdateAutoPost') } : {}),
      ...(bool('weeklyUpdateApproval') !== undefined ? { weeklyUpdateApproval: bool('weeklyUpdateApproval') } : {}),
      ...(bool('updateIncludeProjections') !== undefined
        ? { updateIncludeProjections: bool('updateIncludeProjections') }
        : {}),
      ...(bool('updateIncludeMoney') !== undefined ? { updateIncludeMoney: bool('updateIncludeMoney') } : {}),
      ...(bool('updateIncludeInventory') !== undefined ? { updateIncludeInventory: bool('updateIncludeInventory') } : {}),
      ...(bool('updateIncludeUniverse') !== undefined ? { updateIncludeUniverse: bool('updateIncludeUniverse') } : {}),
      ...(bool('updateIncludeDanger') !== undefined ? { updateIncludeDanger: bool('updateIncludeDanger') } : {}),
    },
  })
  return NextResponse.json({ zombieLeague: row })
}

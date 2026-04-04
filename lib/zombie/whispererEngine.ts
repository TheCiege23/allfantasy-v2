import { prisma } from '@/lib/prisma'
import { setWhisperer } from '@/lib/zombie/ZombieOwnerStatusService'

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export type AmbushResult = { ok: boolean; reason?: string; ambushesRemaining?: number }

export async function selectWhisperer(
  zombieLeagueId: string,
  mode: string,
  manualUserId?: string,
): Promise<{ whispererRecordId: string; rosterId: string }> {
  const z = await prisma.zombieLeague.findUniqueOrThrow({
    where: { id: zombieLeagueId },
    include: { league: true },
  })

  const leagueId = z.leagueId
  const teams = await prisma.zombieLeagueTeam.findMany({ where: { leagueId } })
  if (teams.length === 0) throw new Error('No zombie team rows — run assignTeams / roster sync first.')

  let pickRosterId: string | null = null

  if (mode === 'manual') {
    if (!manualUserId) throw new Error('manualUserId required for manual mode')
    const roster = await prisma.roster.findFirst({
      where: { leagueId, platformUserId: manualUserId },
    })
    if (!roster) throw new Error('User is not in this league')
    pickRosterId = roster.id
  } else if (mode === 'veteran_priority') {
    const vets = teams.filter((t) => t.isVeteran)
    const pool = vets.length ? vets : teams
    pickRosterId = shuffle(pool)[0]?.rosterId ?? null
  } else {
    pickRosterId = shuffle(teams)[0]?.rosterId ?? null
  }

  if (!pickRosterId) throw new Error('Could not select Whisperer')

  const user = await prisma.roster.findUnique({
    where: { id: pickRosterId },
    select: { platformUserId: true },
  })
  const uid = user?.platformUserId ?? 'unknown'

  await setWhisperer(leagueId, pickRosterId)

  const displayName =
    (await prisma.appUser.findUnique({ where: { id: uid }, select: { displayName: true } }))?.displayName ??
    uid

  const amb = z.whispererAmbushCount ?? 3
  const rec = await prisma.whispererRecord.upsert({
    where: { zombieLeagueId },
    create: {
      zombieLeagueId,
      userId: uid,
      displayName,
      selectionMode: mode,
      ambushesGranted: amb,
      ambushesRemaining: amb,
      ambushesUsed: 0,
    },
    update: {
      userId: uid,
      displayName,
      selectionMode: mode,
      ambushesGranted: amb,
      ambushesRemaining: amb,
      ambushesUsed: 0,
    },
  })

  await prisma.zombieLeagueTeam.updateMany({
    where: { leagueId },
    data: { isWhisperer: false },
  })
  await prisma.zombieLeagueTeam.update({
    where: { leagueId_rosterId: { leagueId, rosterId: pickRosterId } },
    data: {
      isWhisperer: true,
      status: 'Whisperer',
      ambushesRemaining: amb,
    },
  })

  const title = z.whispererIsPublic ? 'The Whisperer has been chosen' : 'A Whisperer exists'
  const content = z.whispererIsPublic
    ? 'The Whisperer has been chosen. The infection begins.'
    : 'A Whisperer exists. Stay alert.'

  await prisma.zombieAnnouncement.create({
    data: {
      zombieLeagueId,
      universeId: z.universeId,
      type: 'whisperer_reveal',
      title,
      content,
      isPublic: z.whispererIsPublic,
    },
  })

  return { whispererRecordId: rec.id, rosterId: pickRosterId }
}

export async function applyAmbush(
  zombieLeagueId: string,
  whispererUserId: string,
  targetUserId: string,
  week: number,
  ambushType: string,
): Promise<AmbushResult> {
  const rec = await prisma.whispererRecord.findUnique({ where: { zombieLeagueId } })
  if (!rec || rec.userId !== whispererUserId) return { ok: false, reason: 'Not the Whisperer' }
  if ((rec.ambushesRemaining ?? 0) <= 0) return { ok: false, reason: 'No ambushes remaining' }

  const z = await prisma.zombieLeague.findUnique({ where: { id: zombieLeagueId } })
  if (!z) return { ok: false, reason: 'League not found' }

  const left = (rec.ambushesRemaining ?? 0) - 1
  await prisma.whispererRecord.update({
    where: { id: rec.id },
    data: {
      ambushesRemaining: left,
      ambushesUsed: (rec.ambushesUsed ?? 0) + 1,
    },
  })

  await prisma.zombieAnnouncement.create({
    data: {
      zombieLeagueId,
      universeId: z.universeId,
      type: 'commissioner_note',
      title: `Ambush (${ambushType})`,
      content: `An ambush was resolved for week ${week}. Target roster obscured for audit.`,
      targetUserId,
      week,
    },
  })

  return { ok: true, ambushesRemaining: left }
}

export async function handleWhispererDefeat(
  zombieLeagueId: string,
  defeatedByUserId: string,
  week: number,
): Promise<void> {
  const rec = await prisma.whispererRecord.findUnique({ where: { zombieLeagueId } })
  if (!rec) return

  await prisma.whispererRecord.update({
    where: { id: rec.id },
    data: {
      wasDefeated: true,
      defeatedAtWeek: week,
      defeatedByUserId,
    },
  })

  const rule = rec.postDefeatRule ?? 'commissioner_decides'
  const z = await prisma.zombieLeague.findUnique({ where: { id: zombieLeagueId } })
  if (!z) return

  if (rule === 'new_whisperer_emerges') {
    await selectWhisperer(zombieLeagueId, 'random')
    await prisma.zombieAnnouncement.create({
      data: {
        zombieLeagueId,
        universeId: z.universeId,
        type: 'whisperer_reveal',
        title: 'A new Whisperer rises',
        content: 'A new Whisperer rises from the Horde.',
      },
    })
    return
  }

  await prisma.zombieAnnouncement.create({
    data: {
      zombieLeagueId,
      universeId: z.universeId,
      type: 'season_end',
      title: 'Whisperer defeated',
      content: `The Whisperer was defeated in week ${week}. Rule: ${rule}`,
    },
  })
}

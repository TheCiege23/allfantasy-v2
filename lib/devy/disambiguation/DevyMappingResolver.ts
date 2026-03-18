/**
 * PROMPT 3: Fuzzy name/school/position/class matching and commissioner override queue for devy-to-pro mapping.
 */

import { prisma } from '@/lib/prisma'

function normalize(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[.'-]/g, '')
    .trim()
}

function tokenSet(str: string): Set<string> {
  return new Set(normalize(str).split(/\s+/).filter(Boolean))
}

/**
 * Simple fuzzy match score 0-100: name + optional school/position/class.
 */
export function fuzzyMatchScore(args: {
  nameA: string
  nameB: string
  schoolA?: string | null
  schoolB?: string | null
  positionA?: string | null
  positionB?: string | null
  classYearA?: number | null
  classYearB?: number | null
}): number {
  const nA = normalize(args.nameA)
  const nB = normalize(args.nameB)
  if (nA === nB) return 100
  const tokensA = tokenSet(args.nameA)
  const tokensB = tokenSet(args.nameB)
  let score = 0
  const nameOverlap = [...tokensA].filter((t) => tokensB.has(t)).length
  const nameTotal = Math.max(tokensA.size, tokensB.size, 1)
  score += (nameOverlap / nameTotal) * 70

  if (args.schoolA && args.schoolB && normalize(args.schoolA) === normalize(args.schoolB)) score += 15
  if (args.positionA && args.positionB && normalize(args.positionA) === normalize(args.positionB)) score += 10
  if (args.classYearA != null && args.classYearB != null && args.classYearA === args.classYearB) score += 5

  return Math.min(100, Math.round(score))
}

/**
 * Find best pro player match for a DevyPlayer (by name/school/position). Returns candidate id and confidence.
 */
export async function findBestProMatchForDevy(args: {
  devyPlayerId: string
  sport: string
  minConfidence?: number
}): Promise<{ proPlayerId: string | null; confidence: number }> {
  const devy = await prisma.devyPlayer.findUnique({ where: { id: args.devyPlayerId } })
  if (!devy) return { proPlayerId: null, confidence: 0 }

  const sport = args.sport.toUpperCase()
  if (sport !== 'NFL' && sport !== 'NBA') return { proPlayerId: null, confidence: 0 }

  const minConf = args.minConfidence ?? 80
  let best: { id: string; score: number } | null = null

  if (sport === 'NFL') {
    const players = await (prisma as any).sportsPlayer?.findMany?.({
      where: { sport: 'NFL' },
      select: { id: true, name: true },
      take: 2000,
    })
    if (Array.isArray(players)) {
      for (const p of players) {
        const score = fuzzyMatchScore({
          nameA: devy.name,
          nameB: p.name,
          schoolA: devy.school,
          positionA: devy.position,
        })
        if (score >= minConf && (!best || score > best.score)) best = { id: p.id, score }
      }
    }
  }

  if (best) return { proPlayerId: best.id, confidence: best.score }
  return { proPlayerId: null, confidence: 0 }
}

/**
 * Create commissioner override for ambiguous mapping (to be resolved by commissioner).
 */
export async function createCommissionerOverride(args: {
  leagueId: string
  devyPlayerId: string
  proPlayerId?: string
  action: string
  notes?: string
}): Promise<{ id: string }> {
  const row = await prisma.devyCommissionerOverride.create({
    data: {
      leagueId: args.leagueId,
      devyPlayerId: args.devyPlayerId,
      proPlayerId: args.proPlayerId ?? null,
      action: args.action,
      status: 'pending',
      notes: args.notes ?? null,
    },
  })
  return { id: row.id }
}

/**
 * Resolve pending override (commissioner applies or rejects).
 */
export async function resolveCommissionerOverride(args: {
  overrideId: string
  status: 'applied' | 'rejected'
  resolvedBy: string
  proPlayerId?: string
}): Promise<{ ok: boolean; error?: string }> {
  const override = await prisma.devyCommissionerOverride.findUnique({ where: { id: args.overrideId } })
  if (!override) return { ok: false, error: 'Override not found' }
  if (override.status !== 'pending') return { ok: false, error: 'Override already resolved' }

  await prisma.devyCommissionerOverride.update({
    where: { id: args.overrideId },
    data: {
      status: args.status,
      resolvedAt: new Date(),
      resolvedBy: args.resolvedBy,
      ...(args.proPlayerId != null && { proPlayerId: args.proPlayerId }),
    },
  })
  return { ok: true }
}

/**
 * List pending overrides for a league.
 */
export async function listPendingOverrides(leagueId: string): Promise<
  Array<{
    id: string
    devyPlayerId: string
    proPlayerId: string | null
    action: string
    notes: string | null
    createdAt: Date
  }>
> {
  const rows = await prisma.devyCommissionerOverride.findMany({
    where: { leagueId, status: 'pending' },
    orderBy: { createdAt: 'asc' },
    select: { id: true, devyPlayerId: true, proPlayerId: true, action: true, notes: true, createdAt: true },
  })
  return rows
}

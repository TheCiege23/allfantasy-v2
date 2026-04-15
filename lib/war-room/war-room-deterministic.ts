import type { SupportedSport } from '@/lib/sport-scope'

/**
 * Deterministic player compare — no model call; pairs with AI layer for narrative.
 */
export function comparePlayersDeterministic(args: {
  sport: SupportedSport
  a: { name: string; position: string; adp?: number | null }
  b: { name: string; position: string; adp?: number | null }
}): {
  lean: 'a' | 'b' | 'even'
  summary: string
  factors: string[]
} {
  const { a, b } = args
  const factors: string[] = []
  let score = 0
  if (a.adp != null && b.adp != null) {
    if (a.adp < b.adp) {
      score -= 1
      factors.push(`${a.name} is drafted earlier (ADP ${a.adp} vs ${b.adp}).`)
    } else if (b.adp < a.adp) {
      score += 1
      factors.push(`${b.name} is drafted earlier (ADP ${b.adp} vs ${a.adp}).`)
    }
  } else {
    factors.push('ADP not available for both — lean on roster need and weekly ceiling.')
  }
  if (a.position !== b.position) {
    factors.push(`Different positions (${a.position} vs ${b.position}) — prioritize roster construction.`)
  }
  const lean: 'a' | 'b' | 'even' = score < 0 ? 'a' : score > 0 ? 'b' : 'even'
  const summary =
    lean === 'even'
      ? `Tie-breaker: roster need, schedule, and injury news — ${a.name} vs ${b.name} is close.`
      : lean === 'a'
        ? `Slight lean to ${a.name} on value signals; confirm with your build.`
        : `Slight lean to ${b.name} on value signals; confirm with your build.`
  return { lean, summary, factors }
}

export function buildOutlookStub(args: {
  playerName: string
  position: string
  team?: string | null
  sport: SupportedSport
}): { summary: string; confidence: number } {
  const teamBit = args.team ? ` (${args.team})` : ''
  return {
    summary: `${args.playerName}${teamBit} — ${args.position} outlook for ${args.sport}: treat as roster-dependent until news locks. Check camp beat, target share trends, and bye week stacking before committing draft capital.`,
    confidence: 0.55,
  }
}

export function buildPostDraftReportStub(args: {
  picks: Array<{ round: number; playerName: string; position: string }>
  sport: SupportedSport
}): { headline: string; bullets: string[]; grade: string } {
  const n = args.picks.length
  const positions = args.picks.reduce<Record<string, number>>((acc, p) => {
    acc[p.position] = (acc[p.position] ?? 0) + 1
    return acc
  }, {})
  const bullets = [
    `Drafted ${n} players in ${args.sport} context.`,
    `Position spread: ${Object.entries(positions)
      .map(([k, v]) => `${k}×${v}`)
      .join(', ')}.`,
    'Review waiver wire for upside backups and handcuffs in weeks 1–4.',
  ]
  return {
    headline: 'Post-draft roster snapshot',
    bullets,
    grade: 'B+',
  }
}

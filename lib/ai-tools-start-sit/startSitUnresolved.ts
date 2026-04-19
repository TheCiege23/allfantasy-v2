export type StartSitUnresolvedDecision = {
  slotLabel: string
  optionA: string
  optionB: string
  projectedGap: number
  urgency: 'low' | 'medium' | 'high'
  /** Informational when lineup is not manually settable (e.g. best ball). */
  informationalOnly?: boolean
}

/**
 * Surfaces close lineup calls where projection difference is small — real roster data only.
 */
export function buildUnresolvedLineupDecisions(args: {
  lineupSlotAnalysis: { slotName: string; topCandidates: string[] }[]
  playersByNameLower: Map<string, { projectedPoints: number | null }>
  /** Minimum projected point gap to still count as "decided" */
  gapThreshold?: number
  bestBallInformational?: boolean
}): StartSitUnresolvedDecision[] {
  const gap = args.gapThreshold ?? 2.5
  const out: StartSitUnresolvedDecision[] = []
  for (const s of args.lineupSlotAnalysis) {
    const names = s.topCandidates.slice(0, 2)
    if (names.length < 2) continue
    const a = args.playersByNameLower.get(names[0].toLowerCase())
    const b = args.playersByNameLower.get(names[1].toLowerCase())
    const pa = a?.projectedPoints
    const pb = b?.projectedPoints
    if (pa == null || pb == null) continue
    const d = Math.abs(pa - pb)
    if (d >= gap) continue
    const urgency: StartSitUnresolvedDecision['urgency'] =
      d < 1 ? 'high' : d < 1.75 ? 'medium' : 'low'
    out.push({
      slotLabel: s.slotName,
      optionA: names[0],
      optionB: names[1],
      projectedGap: Math.round(d * 10) / 10,
      urgency,
      informationalOnly: args.bestBallInformational === true,
    })
  }
  return out.slice(0, 12)
}

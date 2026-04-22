/**
 * Indexes headlines + injury rows from `/draft/assistant-context` by normalized player name
 * so the live draft room can attach real news/injury context per player without N+1 API calls.
 */

export type AssistantFeedSnapshot = {
  headlineTitle?: string
  headlineAt?: string | null
  headlineTeam?: string | null
  injuryStatus?: string | null
  injuryNote?: string | null
}

function nameKey(name: string): string {
  return name.trim().toLowerCase()
}

/** Headline shape from GET /draft/assistant-context */
export type AssistantHeadlineRow = {
  title?: string | null
  playerName?: string | null
  team?: string | null
  publishedAt?: string | null
}

/** Injury shape from GET /draft/assistant-context */
export type AssistantInjuryRow = {
  playerName?: string | null
  team?: string | null
  status?: string | null
  note?: string | null
}

export function buildAssistantFeedByPlayerName(
  headlines: AssistantHeadlineRow[],
  injuries: AssistantInjuryRow[],
): Map<string, AssistantFeedSnapshot> {
  const m = new Map<string, AssistantFeedSnapshot>()
  for (const h of headlines) {
    const pn = typeof h.playerName === 'string' ? h.playerName.trim() : ''
    if (!pn || !h.title?.trim()) continue
    const k = nameKey(pn)
    const prev = m.get(k)
    if (!prev?.headlineTitle) {
      m.set(k, {
        ...(prev ?? {}),
        headlineTitle: h.title!.trim(),
        headlineAt: h.publishedAt ?? null,
        headlineTeam: typeof h.team === 'string' ? h.team.trim() || null : null,
      })
    }
  }
  for (const inj of injuries) {
    const pn = typeof inj.playerName === 'string' ? inj.playerName.trim() : ''
    if (!pn) continue
    const k = nameKey(pn)
    const prev = m.get(k) ?? {}
    m.set(k, {
      ...prev,
      injuryStatus: inj.status?.trim() || prev.injuryStatus || null,
      injuryNote: inj.note?.trim() || prev.injuryNote || null,
    })
  }
  return m
}

export function getAssistantFeedForPlayer(
  map: Map<string, AssistantFeedSnapshot>,
  playerName: string,
): AssistantFeedSnapshot | null {
  const snap = map.get(nameKey(playerName))
  if (!snap) return null
  if (
    !snap.headlineTitle &&
    !snap.injuryStatus &&
    !snap.injuryNote
  ) {
    return null
  }
  return snap
}

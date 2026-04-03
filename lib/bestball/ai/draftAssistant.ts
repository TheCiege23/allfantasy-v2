import type { BestBallSportTemplate } from '@prisma/client'
import { validateBestBallRoster } from '../rosterValidator'

export type DraftedPlayer = { playerId: string; name: string; pos: string; team?: string }
export type DraftPlayer = { playerId: string; name: string; pos: string; adp?: number }

export type DraftRecommendation = {
  bestPick: { playerId: string; name: string; position: string; reasoning: string }
  safePick: { playerId: string; name: string; position: string; reasoning: string }
  upsidePick: { playerId: string; name: string; position: string; reasoning: string }
  structuralPick: { playerId: string; name: string; position: string; reasoning: string } | null
  leveragePick: { playerId: string; name: string; position: string; reasoning: string } | null
  rosterAlert: string | null
  pickContext: string
}

export async function getLiveDraftRecommendation(
  currentRoster: DraftedPlayer[],
  availablePlayers: DraftPlayer[],
  sport: string,
  variant: string,
  draftSlot: number,
  pickNumber: number,
  template: BestBallSportTemplate,
): Promise<DraftRecommendation> {
  const v = validateBestBallRoster(
    currentRoster.map((p) => ({ position: p.pos })),
    template,
  )
  const top = availablePlayers.slice(0, 20)
  const first = top[0]
  const second = top[1] ?? first
  const third = top[2] ?? second
  return {
    bestPick: {
      playerId: first?.playerId ?? 'unknown',
      name: first?.name ?? '—',
      position: first?.pos ?? '—',
      reasoning: `Best available by board for ${sport} ${variant} (slot ${draftSlot}, pick ${pickNumber}).`,
    },
    safePick: {
      playerId: second?.playerId ?? first?.playerId ?? 'unknown',
      name: second?.name ?? first?.name ?? '—',
      position: second?.pos ?? first?.pos ?? '—',
      reasoning: 'Floor-focused option for best ball depth.',
    },
    upsidePick: {
      playerId: third?.playerId ?? first?.playerId ?? 'unknown',
      name: third?.name ?? first?.name ?? '—',
      position: third?.pos ?? first?.pos ?? '—',
      reasoning: 'Higher ceiling swing if you want volatility.',
    },
    structuralPick:
      v.criticalErrors.length > 0 && first
        ? {
            playerId: first.playerId,
            name: first.name,
            position: first.pos,
            reasoning: 'Addresses a structural roster gap.',
          }
        : null,
    leveragePick:
      variant === 'tournament' && top[3]
        ? {
            playerId: top[3].playerId,
            name: top[3].name,
            position: top[3].pos,
            reasoning: 'Differentiation angle for tournament fields.',
          }
        : null,
    rosterAlert: v.criticalErrors[0]?.issue ?? null,
    pickContext: `Roster validation: ${v.isValid ? 'ok' : 'needs work'} — ${v.warnings.length} notes.`,
  }
}

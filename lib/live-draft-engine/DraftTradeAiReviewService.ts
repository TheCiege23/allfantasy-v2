export type DraftTradeAiVerdict = 'accept' | 'reject' | 'counter'

export type DraftTradeAiReview = {
  verdict: DraftTradeAiVerdict
  reasons: string[]
  declineReasons: string[]
  counterReasons: string[]
  summary: string
  suggestedCounterPackage: string | null
}

export type DraftTradeAiReviewInput = {
  giveRound: number
  giveSlot: number
  receiveRound: number
  receiveSlot: number
  teamCount: number
}

function formatPickLabel(round: number, slot: number): string {
  return `${round}.${String(slot).padStart(2, '0')}`
}

export function buildDraftTradeAiReview(input: DraftTradeAiReviewInput): DraftTradeAiReview {
  const teamCount = Math.max(2, Number(input.teamCount) || 12)
  const giveOverall = (input.giveRound - 1) * teamCount + input.giveSlot
  const receiveOverall = (input.receiveRound - 1) * teamCount + input.receiveSlot
  const overallDelta = receiveOverall - giveOverall
  const giveLabel = formatPickLabel(input.giveRound, input.giveSlot)
  const receiveLabel = formatPickLabel(input.receiveRound, input.receiveSlot)

  let verdict: DraftTradeAiVerdict = 'accept'
  const reasons: string[] = []
  const declineReasons: string[] = []
  const counterReasons: string[] = []
  let suggestedCounterPackage: string | null = null

  if (overallDelta <= -2) {
    verdict = 'accept'
    reasons.push(
      `You would receive an earlier pick (${receiveLabel}) for a later pick (${giveLabel}), which is typically favorable.`
    )
    reasons.push('Accept if this aligns with your positional targets for that range.')
  } else if (overallDelta >= teamCount) {
    verdict = 'reject'
    reasons.push(
      `You would move back significantly from ${giveLabel} to ${receiveLabel}.`
    )
    declineReasons.push('Pick downgrade is too large without additional compensation.')
    declineReasons.push('Reject unless the offer includes extra draft value.')
  } else if (overallDelta > 0) {
    verdict = 'counter'
    reasons.push(
      `You are giving an earlier pick (${giveLabel}) for a later one (${receiveLabel}).`
    )
    const suggestedRound = Math.max(input.receiveRound + 1, input.giveRound + 1)
    suggestedCounterPackage = `Ask for an additional future pick (for example round ${suggestedRound}) or a move-up on the return pick.`
    counterReasons.push('Current offer favors the proposer on draft capital.')
    counterReasons.push(suggestedCounterPackage)
  } else {
    verdict = 'accept'
    reasons.push('Pick values are close. Accept if this improves your preferred board flow.')
    reasons.push('Counter only if you want a specific tier break in a nearby slot.')
  }

  const summary = reasons[0] ?? 'Review this proposal in your private AI context before responding.'
  return {
    verdict,
    reasons,
    declineReasons,
    counterReasons,
    summary,
    suggestedCounterPackage,
  }
}

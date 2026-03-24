/**
 * TradeValueBreakdownResolver — fairness score display, winner label, and value breakdown for UI.
 */

export function getFairnessScore(result: { evaluation?: { fairness_score_0_to_100?: number; fairness_score?: number } }): number {
  const ev = result?.evaluation
  return ev?.fairness_score_0_to_100 ?? ev?.fairness_score ?? 50
}

export function getFairnessColorClass(score: number): string {
  if (score >= 45 && score <= 55) return "text-emerald-400"
  if (score >= 35 && score <= 65) return "text-yellow-400"
  return "text-red-400"
}

export function getWinnerLabel(winner: string | undefined, senderName: string, receiverName: string): string {
  if (winner === "sender") return senderName || "Sender"
  if (winner === "receiver") return receiverName || "Receiver"
  return "Even Trade"
}

export type ValueBreakdownSide = { label: string; totalValue?: number; assets: string[] }

export function formatValueBreakdown(sideA: ValueBreakdownSide, sideB: ValueBreakdownSide): { sideA: string; sideB: string } {
  const a = sideA.assets.length ? sideA.assets.join(", ") : "—"
  const b = sideB.assets.length ? sideB.assets.join(", ") : "—"
  return { sideA: a, sideB: b }
}

type LensPlayer = { name?: string; age?: string | number }
type LensPick = { year?: string | number; round?: string | number }

export function estimateTradeValueLens(
  players: LensPlayer[],
  picks: LensPick[],
  faab = 0,
  currentYear = new Date().getFullYear()
): { current: number; future: number; total: number } {
  let current = 0
  let future = 0

  for (const p of players) {
    const hasName = String(p?.name ?? "").trim().length > 0
    if (!hasName) continue

    current += 10
    future += 10

    const age = Number(p?.age)
    if (!Number.isFinite(age)) {
      current += 2
      future += 1
      continue
    }

    if (age <= 24) {
      current += 2
      future += 4
    } else if (age <= 28) {
      current += 4
      future += 2
    } else if (age <= 31) {
      current += 2
      future -= 1
    } else {
      current += 1
      future -= 3
    }
  }

  for (const pick of picks) {
    const year = Number(pick?.year)
    const round = Number(pick?.round)
    if (!Number.isFinite(year) || !Number.isFinite(round)) continue

    if (round === 1) {
      current += 1
      future += 6
    } else if (round === 2) {
      current += 1
      future += 3
    } else if (round === 3) {
      current += 0.5
      future += 2
    } else {
      current += 0.25
      future += 1
    }

    if (year > currentYear) {
      future += Math.min(3, year - currentYear)
    }
  }

  if (faab > 0) {
    current += Math.min(5, faab / 20)
    future += Math.min(3, faab / 60)
  }

  const roundedCurrent = Number(current.toFixed(1))
  const roundedFuture = Number(future.toFixed(1))
  return {
    current: roundedCurrent,
    future: roundedFuture,
    total: Number((roundedCurrent + roundedFuture).toFixed(1)),
  }
}

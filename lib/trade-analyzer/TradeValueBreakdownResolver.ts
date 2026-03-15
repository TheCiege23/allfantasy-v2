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

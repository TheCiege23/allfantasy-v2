import type { ChimmyOrchestrationMeta } from './types'

/**
 * Detects whether the assistant already followed the orchestration output contract.
 */
function replyHasOrchestrationShape(body: string): boolean {
  const t = body.trim()
  if (t.length < 40) return false
  const hasDirect =
    /\*\*direct\b/i.test(t) ||
    /^#{1,3}\s*direct\b/im.test(t) ||
    /^direct\s*take:/im.test(t)
  const hasWhy = /\*\*why\b/i.test(t) || /^#{1,3}\s*why\b/im.test(t) || /\bwhy\s+(this|it)\b/i.test(t)
  const hasToolOrLink =
    /\]\(\/[^)]+\)/.test(t) ||
    /\b(trade analyzer|waiver ai|start a vs b|matchup simulator|mock draft)\b/i.test(t)
  return hasDirect && (hasWhy || hasToolOrLink)
}

/**
 * Appends a compact, non-duplicative footer so every reply exposes
 * intent, tool deep-link, memory hint, and a follow-up — without replacing model prose.
 */
export function appendOrchestrationFooterIfMissing(
  body: string,
  orchestration: ChimmyOrchestrationMeta
): string {
  const trimmed = body.trim()
  if (!trimmed) return trimmed
  if (replyHasOrchestrationShape(trimmed)) {
    return trimmed
  }

  const { intentLabel, confidence, primaryLaunch, memorySummary, answerShape } = orchestration
  const lines: string[] = ['', '---', '**Chimmy routing**']
  lines.push(
    `- **Intent:** ${intentLabel} (~${(confidence * 100).toFixed(0)}% route match)`
  )
  if (primaryLaunch) {
    lines.push(
      `- **Go deeper:** [${primaryLaunch.label}](${primaryLaunch.href}) — ${primaryLaunch.description}`
    )
  }
  if (memorySummary) {
    lines.push(`- **Your profile:** ${memorySummary}`)
  }
  lines.push(`- **Try asking:** ${answerShape.followUp}`)
  lines.push(
    `- **Routing note:** ${answerShape.confidenceLine}`
  )

  return `${trimmed}\n${lines.join('\n')}`
}

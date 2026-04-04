import type { ImportAuditSummary } from '@/lib/devy/mergeExecutionEngine'

export function formatImportAuditPlainText(
  audit: ImportAuditSummary,
  session: { id: string; status: string; mergedAt: string | null; summary?: unknown },
): string {
  const lines: string[] = [
    'ALLFANTASY — DEVY IMPORT AUDIT',
    '==============================',
    '',
    `Session ID: ${session.id}`,
    `Status: ${session.status}`,
    `Merged at: ${session.mergedAt ?? '—'}`,
    '',
    '--- Summary ---',
    `Data confidence: ${audit.dataConfidenceScore}`,
    `Players imported (matched): ${audit.playersImported}`,
    `Conflicts resolved: ${audit.conflictsResolved}`,
    `Conflicts pending: ${audit.conflictsPending}`,
    `Managers matched: ${audit.managersMatched}`,
    `History seasons imported: ${audit.historySeasonsImported}`,
    `Picks imported (league total): ${audit.picksImported}`,
    '',
    '--- Unmatched players ---',
  ]
  if (audit.unmatchedPlayers.length === 0) lines.push('(none)')
  else for (const p of audit.unmatchedPlayers) lines.push(`- ${p.name} (${p.id})`)

  lines.push('', '--- Managers needing link ---')
  if (audit.managersUnmatched.length === 0) lines.push('(none)')
  else for (const m of audit.managersUnmatched) lines.push(`- ${m.label} (${m.id})`)

  lines.push('', '--- Notes ---')
  if (audit.notes.length === 0) lines.push('(none)')
  else for (const n of audit.notes) lines.push(`- ${n}`)

  if (audit.missingImages.length || audit.missingSchoolLogos.length) {
    lines.push('', '--- Assets ---')
    lines.push(`Missing images: ${audit.missingImages.length}`)
    lines.push(`Missing school logos: ${audit.missingSchoolLogos.length}`)
  }

  if (session.summary != null) {
    lines.push('', '--- Raw session summary (JSON) ---')
    try {
      lines.push(JSON.stringify(session.summary, null, 2))
    } catch {
      lines.push(String(session.summary))
    }
  }

  lines.push('', '--- End ---')
  return lines.join('\n')
}

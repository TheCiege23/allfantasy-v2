/**
 * lib/commissioner/CommissionerChangeNotifier.ts
 * Sends a message to the league chat when a commissioner makes changes.
 * Message format: "[Commissioner] changed {setting}: {old} → {new}"
 */

import { createLeagueChatMessage } from '@/lib/league-chat/LeagueChatMessageService'

export interface CommissionerChange {
  field: string
  oldValue: string
  newValue: string
}

/**
 * Post a commissioner change notification to the league chat.
 * @param leagueId - The league ID
 * @param commissionerId - The commissioner's user ID
 * @param category - Settings category (e.g. "Scoring Settings", "Roster Settings")
 * @param changes - Array of changes made
 */
export async function notifyCommissionerChange(
  leagueId: string,
  commissionerId: string,
  category: string,
  changes: CommissionerChange[]
): Promise<void> {
  if (changes.length === 0) return

  const lines = changes.map(
    (c) => `• ${c.field}: ${c.oldValue} → ${c.newValue}`
  )

  const message = `⚙️ **Commissioner Update — ${category}**\n${lines.join('\n')}`

  try {
    await createLeagueChatMessage(leagueId, commissionerId, message, {
      type: 'text',
      source: null,
      messageSubtype: 'commissioner_change',
      metadata: {
        category,
        changes,
        isSystemMessage: true,
      },
    })
  } catch {
    // Non-fatal: league still functions without chat notification
    console.warn('[CommissionerChangeNotifier] Failed to post change notification')
  }
}

/**
 * Build change entries by diffing old and new configs.
 * Only includes keys that actually changed.
 */
export function diffConfig(
  oldConfig: Record<string, unknown>,
  newConfig: Record<string, unknown>,
  labelMap?: Record<string, string>
): CommissionerChange[] {
  const changes: CommissionerChange[] = []
  const allKeys = new Set([...Object.keys(oldConfig), ...Object.keys(newConfig)])

  for (const key of allKeys) {
    const oldVal = oldConfig[key]
    const newVal = newConfig[key]
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      const label = labelMap?.[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
      changes.push({
        field: label,
        oldValue: formatValue(oldVal),
        newValue: formatValue(newVal),
      })
    }
  }

  return changes
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '(none)'
  if (typeof val === 'boolean') return val ? 'On' : 'Off'
  if (typeof val === 'number') return String(val)
  if (typeof val === 'string') return val || '(empty)'
  if (Array.isArray(val)) return val.length > 0 ? val.join(', ') : '(none)'
  return JSON.stringify(val).slice(0, 100)
}

/** Status + item emoji / labels for UI (client can map to CSS tokens). */

export const ZOMBIE_STATUS_ICON: Record<string, string> = {
  survivor: '🧍',
  whisperer: '🎭',
  zombie: '🧟',
  revived_survivor: '⚡',
  eliminated: '💀',
}

export const ZOMBIE_STATUS_COLOR: Record<string, string> = {
  survivor: '#22C55E',
  whisperer: '#DC2626',
  zombie: '#7C3AED',
  revived_survivor: '#F5B800',
  eliminated: '#6B7280',
}

export const ZOMBIE_ITEM_ICON: Record<string, string> = {
  serum_antidote: '🧪',
  weapon_knife: '🔪',
  weapon_axe: '🪓',
  weapon_bow: '🏹',
  weapon_gun: '🔫',
  weapon_bomb: '💣',
  ambush: '⚡',
}

export function formatWeeklyZombieReport(input: {
  week: number
  infections: number
  survivors: number
  whispererActive: boolean
  ambushesUsed: number
  serumsUsed: number
  weaponsActive: number
  hordeWinnings: number
  paid: boolean
}): string {
  const w = input.week
  return `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WEEK ${w} — ZOMBIE REPORT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧟 New Infections: ${input.infections}
🧍 Survivors Remaining: ${input.survivors}
🎭 Whisperer Status: ${input.whispererActive ? 'Active' : 'Fallen'}
⚡ Ambushes Used: ${input.ambushesUsed}
🧪 Serums Used: ${input.serumsUsed}
⚔️ Weapons Active: ${input.weaponsActive}
💰 Horde Winnings: ${input.paid ? `$${input.hordeWinnings.toFixed(2)}` : `${input.hordeWinnings.toFixed(1)} pts`}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
}

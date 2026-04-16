import { prisma } from '@/lib/prisma'
import type { ZombieChimmyIntent } from '@/lib/zombie/chimmy-zombie-intents'

export type ParsedZombieChimmyIntent = {
  intent: ZombieChimmyIntent
  confidence: number
}

/**
 * Lightweight keyword router for Chimmy → `zombie_chimmy_actions`.
 * Does not execute game logic; persists intent for commissioner review / downstream processors.
 */
export function parseZombieChimmyIntentFromMessage(text: string): ParsedZombieChimmyIntent | null {
  const t = text.trim().toLowerCase()
  if (t.length < 2) return null

  const rules: { keys: string[]; intent: ZombieChimmyIntent; confidence: number }[] = [
    { keys: ['use serum', 'serum', 'revive', 'antidote'], intent: 'use_serum', confidence: 0.85 },
    { keys: ['use weapon', 'weapon', 'shield', 'gun', 'bomb item'], intent: 'use_weapon', confidence: 0.82 },
    { keys: ['declare bomb', 'activate bomb', ' time bomb', 'bomb '], intent: 'declare_bomb', confidence: 0.8 },
    { keys: ['ambush', 'remap', 'swap matchup'], intent: 'trigger_ambush', confidence: 0.78 },
    { keys: ['inventory', 'items', 'what do i hold', 'my serum'], intent: 'query_inventory', confidence: 0.75 },
    { keys: ['whisperer', 'am i whisperer', 'my role'], intent: 'query_role', confidence: 0.72 },
    { keys: ['rules', 'how does zombie', 'explain zombie'], intent: 'query_rules', confidence: 0.7 },
    { keys: ['trade ', 'can i trade', 'trade serum', 'trade weapon'], intent: 'query_trade_validity', confidence: 0.68 },
    { keys: ['valid', 'can i use', 'legal play'], intent: 'query_item_validity', confidence: 0.65 },
    { keys: ['week ', 'scoreboard', 'standings', 'this week', 'what week'], intent: 'query_week_state', confidence: 0.62 },
  ]

  for (const r of rules) {
    for (const k of r.keys) {
      if (t.includes(k)) {
        return { intent: r.intent, confidence: r.confidence }
      }
    }
  }

  if (t.includes('zombie') || t.includes('horde') || t.includes('infection')) {
    return { intent: 'query_week_state', confidence: 0.45 }
  }

  return null
}

export async function persistZombieChimmyAction(args: {
  leagueId: string
  userId: string
  week: number
  rawMessage: string
  parsed: ParsedZombieChimmyIntent
}): Promise<{ id: string }> {
  const row = await prisma.zombieChimmyAction.create({
    data: {
      leagueId: args.leagueId,
      userId: args.userId,
      week: args.week,
      actionType: args.parsed.intent,
      rawMessage: args.rawMessage,
      parsedAction: { intent: args.parsed.intent, confidence: args.parsed.confidence },
      isValid: true,
      validationError: undefined,
      publicResponse: undefined,
      privateResponse: undefined,
      effect: undefined,
    },
    select: { id: true },
  })
  return row
}

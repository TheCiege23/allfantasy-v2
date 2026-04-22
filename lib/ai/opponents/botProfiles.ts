/**
 * AI opponent catalog — archetypes, weights, and lookup helpers.
 * Deterministic: no I/O. Safe to import from client or server.
 */

import type { BotArchetypeId, BotProfile, StrategicTendencies } from "./types"

const BASE_URL = "https://cdn.allfantasy.ai/bots" // placeholder; UI can override avatarUrl per env

function t(partial: Partial<StrategicTendencies>): StrategicTendencies {
  const base: StrategicTendencies = {
    winNowVsFuture: 0,
    riskTolerance: 0.5,
    tradeAggression: 0.45,
    waiverAggression: 0.45,
    rookieAppetite: 0.4,
    positionalPremiumBias: {},
    zeroRbWeight: 0,
    heroRbWeight: 0,
    qbEarlyWeight: 0,
    tePremiumWeight: 0,
    chaosReach: 0.1,
    devyWeight: 0,
    pickHoarding: 0.2,
    vetBuyerWeight: 0.2,
    floorVsUpside: 0.5,
    bluffTendency: 0.15,
  }
  return { ...base, ...partial }
}

const ARCHETYPES: Record<BotArchetypeId, Omit<BotProfile, "botId" | "displayName" | "avatarUrl">> = {
  balanced_builder: {
    archetypeId: "balanced_builder",
    description: "Steady ADP with light roster-awareness; rarely reaches.",
    tendencies: t({
      winNowVsFuture: 0.1,
      riskTolerance: 0.45,
      rookieAppetite: 0.42,
      zeroRbWeight: 0.2,
      heroRbWeight: 0.2,
      floorVsUpside: 0.52,
    }),
    activityLevel: 1,
  },
  win_now_grinder: {
    archetypeId: "win_now_grinder",
    description: "Pays for reliable production; trades and waivers chase immediate points.",
    tendencies: t({
      winNowVsFuture: 0.85,
      riskTolerance: 0.35,
      tradeAggression: 0.65,
      waiverAggression: 0.7,
      rookieAppetite: 0.25,
      vetBuyerWeight: 0.75,
      floorVsUpside: 0.7,
    }),
    activityLevel: 1.1,
  },
  rookie_hunter: {
    archetypeId: "rookie_hunter",
    description: "Drafts youth and upside; tolerates volatility.",
    tendencies: t({
      winNowVsFuture: -0.2,
      riskTolerance: 0.65,
      rookieAppetite: 0.9,
      devyWeight: 0.5,
      chaosReach: 0.25,
      floorVsUpside: 0.35,
    }),
    activityLevel: 1,
  },
  zero_rb_sharp: {
    archetypeId: "zero_rb_sharp",
    description: "WR/TE anchor early; attacks RB in middle rounds.",
    tendencies: t({
      zeroRbWeight: 0.95,
      heroRbWeight: 0.05,
      positionalPremiumBias: { WR: 0.15, TE: 0.08 },
      rookieAppetite: 0.35,
    }),
    activityLevel: 0.95,
  },
  hero_rb_drafter: {
    archetypeId: "hero_rb_drafter",
    description: "Secures RBs early, fills WR in mid rounds.",
    tendencies: t({
      heroRbWeight: 0.9,
      zeroRbWeight: 0.05,
      positionalPremiumBias: { RB: 0.2 },
      rookieAppetite: 0.38,
    }),
    activityLevel: 1,
  },
  qb_early_drafter: {
    archetypeId: "qb_early_drafter",
    description: "Elevates QB in superflex; still sane in 1QB.",
    tendencies: t({
      qbEarlyWeight: 0.85,
      positionalPremiumBias: { QB: 0.35 },
      floorVsUpside: 0.48,
    }),
    activityLevel: 0.9,
  },
  te_premium_exploiter: {
    archetypeId: "te_premium_exploiter",
    description: "Targets elite TE value when scoring rewards it.",
    tendencies: t({
      tePremiumWeight: 0.9,
      positionalPremiumBias: { TE: 0.35 },
      floorVsUpside: 0.55,
    }),
    activityLevel: 0.95,
  },
  chaos_gambler: {
    archetypeId: "chaos_gambler",
    description: "Wider ADP bands; accepts reach risk for ceiling.",
    tendencies: t({
      riskTolerance: 0.8,
      chaosReach: 0.55,
      tradeAggression: 0.7,
      waiverAggression: 0.75,
      floorVsUpside: 0.25,
      bluffTendency: 0.45,
    }),
    activityLevel: 1.15,
  },
  devy_hoarder: {
    archetypeId: "devy_hoarder",
    description: "Dynasty/devy — prefers college and future assets.",
    tendencies: t({
      winNowVsFuture: -0.5,
      devyWeight: 0.95,
      rookieAppetite: 0.85,
      pickHoarding: 0.75,
    }),
    activityLevel: 0.9,
  },
  pick_collector: {
    archetypeId: "pick_collector",
    description: "Accumulates draft capital; sells aging vets.",
    tendencies: t({
      pickHoarding: 0.95,
      vetBuyerWeight: 0.15,
      winNowVsFuture: -0.45,
      tradeAggression: 0.55,
    }),
    activityLevel: 0.85,
  },
  aging_vet_buyer: {
    archetypeId: "aging_vet_buyer",
    description: "Buys discounted production for playoff pushes.",
    tendencies: t({
      winNowVsFuture: 0.75,
      vetBuyerWeight: 0.9,
      rookieAppetite: 0.2,
      waiverAggression: 0.65,
    }),
    activityLevel: 1,
  },
  risk_averse_floor: {
    archetypeId: "risk_averse_floor",
    description: "Minimizes bust risk; prefers known roles.",
    tendencies: t({
      riskTolerance: 0.2,
      chaosReach: 0.05,
      floorVsUpside: 0.85,
      waiverAggression: 0.35,
      tradeAggression: 0.3,
    }),
    activityLevel: 0.8,
  },
}

const DISPLAY: Record<BotArchetypeId, { name: string; avatarSuffix: string }> = {
  balanced_builder: { name: "Alex Vale", avatarSuffix: "balanced" },
  win_now_grinder: { name: "Jordan Pike", avatarSuffix: "grinder" },
  rookie_hunter: { name: "Sam Reyes", avatarSuffix: "rookies" },
  zero_rb_sharp: { name: "Casey Lin", avatarSuffix: "zerorb" },
  hero_rb_drafter: { name: "Morgan Ellis", avatarSuffix: "herorb" },
  qb_early_drafter: { name: "Riley Cho", avatarSuffix: "qbearly" },
  te_premium_exploiter: { name: "Taylor Vance", avatarSuffix: "teprem" },
  chaos_gambler: { name: "Jamie Knox", avatarSuffix: "chaos" },
  devy_hoarder: { name: "Drew Calloway", avatarSuffix: "devy" },
  pick_collector: { name: "Riley Park", avatarSuffix: "picks" },
  aging_vet_buyer: { name: "Chris Nolan", avatarSuffix: "vets" },
  risk_averse_floor: { name: "Pat Harper", avatarSuffix: "floor" },
}

/** Stable catalog entries — use `af_bot_<archetype>_v1` ids. */
export const BOT_PROFILES: BotProfile[] = (Object.keys(ARCHETYPES) as BotArchetypeId[]).map((id) => {
  const meta = ARCHETYPES[id]
  const d = DISPLAY[id]
  return {
    botId: `af_bot_${id}_v1`,
    displayName: d.name,
    avatarUrl: `${BASE_URL}/${d.avatarSuffix}.png`,
    archetypeId: meta.archetypeId,
    description: meta.description,
    tendencies: meta.tendencies,
    activityLevel: meta.activityLevel,
  }
})

const BY_ID = new Map<string, BotProfile>(BOT_PROFILES.map((b) => [b.botId, b]))
const BY_ARCH = new Map<string, BotProfile>(BOT_PROFILES.map((b) => [b.archetypeId, b]))

export function getBotProfileById(botId: string): BotProfile | null {
  return BY_ID.get(botId) ?? null
}

export function getBotProfileByArchetype(archetypeId: BotArchetypeId): BotProfile | null {
  return BY_ARCH.get(archetypeId) ?? null
}

export function listArchetypeIds(): BotArchetypeId[] {
  return Object.keys(ARCHETYPES) as BotArchetypeId[]
}

/** Deterministic pick from pool using leagueId salt (no Math.random). */
export function pickProfileForSlot(leagueId: string, slotIndex: number, mode: "balanced" | "random" | "commissioner_assigned"): BotProfile {
  const salt = mode === "random" ? "rand" : mode === "commissioner_assigned" ? "comm" : "bal"
  const idx = (hashString(`${leagueId}:${slotIndex}:${salt}`) >>> 0) % BOT_PROFILES.length
  return BOT_PROFILES[idx]!
}

function hashString(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h | 0
}

/** Merge DB tendencies JSON over catalog profile (commissioner tweaks). */
export function mergeTendencies(base: BotProfile, overlay: Partial<StrategicTendencies> | null | undefined): BotProfile {
  if (!overlay) return base
  return {
    ...base,
    tendencies: {
      ...base.tendencies,
      ...overlay,
      positionalPremiumBias: {
        ...base.tendencies.positionalPremiumBias,
        ...overlay.positionalPremiumBias,
      },
    },
  }
}

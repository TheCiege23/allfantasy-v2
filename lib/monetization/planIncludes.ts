export type PlanFamilyKey = "af_pro" | "af_commissioner" | "af_war_room" | "af_all_access"

/** One-line value prop for plan summary grids. */
export const PLAN_FAMILY_SHORT_TAGLINE: Record<PlanFamilyKey, string> = {
  af_pro:
    "Player-focused AI: Chimmy, trades, waivers, and matchup edges across every supported sport.",
  af_commissioner:
    "Commissioner toolkit: governance, automations, and league operations — dues & payouts stay on FanCred.",
  af_war_room:
    "Draft room plus dynasty & long-term planning for deep, year-round fantasy managers.",
  af_all_access:
    "Full stack: AF Pro + Commissioner + War Room in one subscription — best value for power users.",
}

/** Bullets for pricing cards (short lines for narrow columns). */
export const PLAN_FAMILY_INCLUDES: Record<PlanFamilyKey, readonly string[]> = {
  af_pro: [
    "Chimmy AI chat & tools (metered with tokens)",
    "Trade analyzer, waiver wire, matchup breakdowns",
    "NFL, NBA, NHL, MLB, NCAA FB/BB, Soccer coverage",
  ],
  af_commissioner: [
    "Commissioner dashboards & league controls",
    "Automations, approvals, broadcast-style updates",
    "Pairs with free league creation — money flows via FanCred",
  ],
  af_war_room: [
    "Draft room intelligence & prep workflows",
    "Dynasty / keeper & multi-season planning",
    "Built for deep leagues and roster architects",
  ],
  af_all_access: [
    "Everything in Pro, Commissioner & War Room",
    "One subscription, fewer upsells mid-season",
    "Tokens still power heavy AI usage (fair metering)",
  ],
}

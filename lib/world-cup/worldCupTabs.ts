export type WorldCupBracketTab =
  | "home"
  | "group-stage"
  | "picks"
  | "review"
  | "leaderboard"
  | "rules"
  | "invite"
  | "settings"
  | "commissioner"

const WORLD_CUP_TAB_ALIASES: Record<string, WorldCupBracketTab> = {
  home: "home",
  "group-stage": "group-stage",
  picks: "picks",
  knockouts: "picks",
  review: "review",
  leaderboard: "leaderboard",
  rules: "rules",
  invite: "invite",
  settings: "settings",
  commissioner: "commissioner",
}

export function normalizeWorldCupBracketTab(value: string | null | undefined): WorldCupBracketTab {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return "picks"
  return WORLD_CUP_TAB_ALIASES[normalized] ?? "picks"
}

export function worldCupTabToQueryValue(tab: WorldCupBracketTab): string {
  return tab === "picks" ? "knockouts" : tab
}

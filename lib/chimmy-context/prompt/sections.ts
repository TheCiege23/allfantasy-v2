/**
 * Phase 2B — section renderers
 *
 * Pure functions that turn `ChimmyContextBundle` slices into compact markdown
 * sections. Each renderer returns "" when the slice is missing/empty so the
 * composer/budget layer can drop them cleanly.
 */

import type {
  ChimmyContextBundle,
  ImportedHistorySlice,
  LeagueDifficultyContextSlice,
  LeagueSummary,
  MatchupContextSlice,
  RankingContextSlice,
  RosterContextSlice,
  StandingsContextSlice,
  SubscriptionContextSlice,
  UserContextSlice,
} from "@/lib/chimmy-context/types"

function line(label: string, value: string | number | boolean | null | undefined): string | null {
  if (value == null || value === "") return null
  if (typeof value === "number" && !Number.isFinite(value)) return null
  return `- ${label}: ${value}`
}

function joinLines(header: string, items: Array<string | null>): string {
  const body = items.filter((s): s is string => Boolean(s))
  if (body.length === 0) return ""
  return [header, ...body].join("\n")
}

export function renderUserSection(user: UserContextSlice | null): string {
  if (!user) return ""
  return joinLines("## USER", [
    line("Display name", user.displayName),
    line("Timezone", user.timezone),
    line("Preferred language", user.preferredLanguage),
  ])
}

export function renderAIAccessSection(ai: SubscriptionContextSlice | null): string {
  if (!ai) return ""
  const planLabel = ai.planLabel ?? (ai.hasSubscription ? "Premium" : "Free")
  return joinLines("## AI ACCESS", [
    line("Plan", planLabel),
    line("In trial", ai.inTrial ? "yes" : "no"),
    line("Trial days remaining", ai.inTrial ? ai.trialDaysRemaining : null),
    line("Token balance", ai.tokenBalance),
  ])
}

export function renderActiveLeagueSection(lg: LeagueSummary | null): string {
  if (!lg) return ""
  return joinLines("## ACTIVE LEAGUE", [
    line("Name", lg.name),
    line("Platform", lg.platform),
    line("Sport", lg.sport),
    line("Season", lg.season),
    line("Format", lg.format),
    line("Scoring", lg.scoring),
    line("Teams", lg.numTeams),
    line("Your role", lg.role),
  ])
}

export function renderImportedHistorySection(h: ImportedHistorySlice | null): string {
  if (!h || h.totalLeagues === 0) return ""
  const recent = h.recentLeagues
    .slice(0, 3)
    .map((r) => `  - ${r.name} (${r.season}): ${r.record ?? "N/A"}${r.champion ? " — CHAMP" : ""}`)
    .join("\n")
  return joinLines("## IMPORTED HISTORY", [
    line("Source", h.source),
    line("Total leagues", h.totalLeagues),
    line("Total seasons", h.totalSeasons),
    line("Career record", h.careerRecord),
    line("Win %", h.winPercentage),
    line("Championships", h.championships),
    line("Archetype", h.archetype),
    recent ? `- Recent:\n${recent}` : null,
  ])
}

export function renderMatchupSection(m: MatchupContextSlice | null): string {
  if (!m) return ""
  return joinLines("## MATCHUP", [
    line("Week", m.week),
    line("Your projected points", m.yourProjectedPoints),
    line("Opponent projected points", m.opponentProjectedPoints),
    line("Status", m.status),
  ])
}

export function renderRosterSection(r: RosterContextSlice | null): string {
  if (!r) return ""
  const starters = r.starters
    .slice(0, 12)
    .map((p) => `  - ${p.slot ?? "?"}: ${p.name}${p.position ? ` (${p.position})` : ""}${p.team ? ` — ${p.team}` : ""}`)
    .join("\n")
  const bench = r.bench
    .slice(0, 8)
    .map((p) => `  - ${p.name}${p.position ? ` (${p.position})` : ""}${p.team ? ` — ${p.team}` : ""}`)
    .join("\n")
  return joinLines("## ROSTER", [
    starters ? `- Starters:\n${starters}` : null,
    bench ? `- Bench:\n${bench}` : null,
  ])
}

export function renderStandingsSection(s: StandingsContextSlice | null): string {
  if (!s) return ""
  const rows = s.rows
    .slice(0, 12)
    .map(
      (row) =>
        `  - #${row.rank ?? "?"} ${row.teamName ?? row.teamId}: ${row.wins ?? 0}-${row.losses ?? 0}${row.ties ? `-${row.ties}` : ""}`
    )
    .join("\n")
  if (!rows) return ""
  return joinLines("## STANDINGS", [`- Rows:\n${rows}`])
}

export function renderRankingsSection(r: RankingContextSlice | null): string {
  if (!r || !r.snapshot) return ""
  // Snapshot shape is owned by `lib/ranking/types`; render only the high-signal fields.
  const snap = r.snapshot as unknown as Record<string, unknown>
  return joinLines("## RANKINGS", [
    line("Source", typeof snap.source === "string" ? snap.source : null),
    line("Format", typeof snap.format === "string" ? snap.format : null),
    line("As of", typeof snap.asOf === "string" ? snap.asOf : null),
  ])
}

export function renderLeagueDifficultySection(d: LeagueDifficultyContextSlice | null): string {
  if (!d || !d.rating) return ""
  const r = d.rating as unknown as Record<string, unknown>
  return joinLines("## LEAGUE DIFFICULTY", [
    line("Score", typeof r.score === "number" ? r.score : null),
    line("Tier", typeof r.tier === "string" ? r.tier : null),
    line("Opponent strength", typeof r.opponentStrength === "number" ? r.opponentStrength : null),
    line("Scoring complexity", typeof r.scoringComplexity === "number" ? r.scoringComplexity : null),
  ])
}

/**
 * Static personality + guardrail block. Kept short — the main system prompt
 * still holds the bulk of expert-knowledge content.
 */
export function renderChimmyPersonalitySection(): string {
  return [
    "## CHIMMY PERSONALITY",
    "- Tone: direct, friendly, evidence-led.",
    "- Cite specific numbers from the context above when available.",
    "- Never fabricate stats. If a slice is missing, say so briefly.",
    "- Recommendations only — never claim to execute trades, lineup moves, or waivers.",
  ].join("\n")
}

/** Convenience: every renderer keyed by section id. */
export function renderAllSections(bundle: ChimmyContextBundle): Record<string, string> {
  return {
    user: renderUserSection(bundle.user),
    aiAccess: renderAIAccessSection(bundle.aiAccess),
    activeLeague: renderActiveLeagueSection(bundle.activeLeague),
    matchup: renderMatchupSection(bundle.matchup),
    roster: renderRosterSection(bundle.roster),
    standings: renderStandingsSection(bundle.standings),
    rankings: renderRankingsSection(bundle.rankings),
    leagueDifficulty: renderLeagueDifficultySection(bundle.leagueDifficulty),
    importedHistory: renderImportedHistorySection(bundle.importedHistory),
    personality: renderChimmyPersonalitySection(),
  }
}

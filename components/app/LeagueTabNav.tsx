"use client"

export type LeagueShellTab =
  | "Overview"
  | "Team"
  | "Matchups"
  | "Roster"
  | "Players"
  | "Waivers"
  | "Trades"
  | "Draft"
  | "Standings / Playoffs"
  | "League"
  | "Chat"
  | "Settings"
  | "Previous Leagues"

export const LEAGUE_SHELL_TABS: LeagueShellTab[] = [
  "Overview",
  "Team",
  "Matchups",
  "Roster",
  "Players",
  "Waivers",
  "Trades",
  "Draft",
  "Standings / Playoffs",
  "League",
  "Chat",
  "Settings",
  "Previous Leagues",
]

export default function LeagueTabNav({ activeTab, onChange }: { activeTab: LeagueShellTab; onChange: (tab: LeagueShellTab) => void }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] p-2">
      {LEAGUE_SHELL_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition ${activeTab === tab ? "bg-white text-black" : "border border-white/10 bg-black/20 text-white/75 hover:bg-white/10"}`}
        >
          {tab}
        </button>
      ))}
    </div>
  )
}

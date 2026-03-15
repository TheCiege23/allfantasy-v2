/**
 * QuickActionsService — universal quick actions for search/command palette.
 * Covers: mock draft, trade analyzer, waiver advisor, Chimmy, create league, find league, and nav.
 */

export interface QuickActionItem {
  id: string
  label: string
  href: string
  description?: string
  category: "tool" | "nav" | "ai" | "league"
}

/** Quick actions shown in search overlay (e.g. when empty or "go to" actions). */
export const UNIVERSAL_QUICK_ACTIONS: QuickActionItem[] = [
  { id: "mock_draft", label: "Start mock draft", href: "/af-legacy?tab=mock-draft", description: "Draft War Room", category: "tool" },
  { id: "trade_analyzer", label: "Open trade analyzer", href: "/trade-evaluator", description: "Evaluate trades", category: "tool" },
  { id: "waiver_advisor", label: "Open waiver advisor", href: "/waiver-ai", description: "Waiver wire help", category: "tool" },
  { id: "ask_chimmy", label: "Ask Chimmy", href: "/af-legacy?tab=chat", description: "AI chat", category: "ai" },
  { id: "create_league", label: "Create league", href: "/brackets/leagues/new", description: "Bracket pool", category: "league" },
  { id: "find_league", label: "Find league", href: "/leagues", description: "My leagues", category: "league" },
  { id: "dashboard", label: "Dashboard", href: "/dashboard", description: "Home overview", category: "nav" },
  { id: "webapp", label: "WebApp", href: "/app/home", description: "Leagues & roster", category: "nav" },
  { id: "brackets", label: "Bracket Challenge", href: "/brackets", description: "Pools & entries", category: "nav" },
  { id: "legacy", label: "Legacy AI", href: "/af-legacy", description: "Team scan, trade center", category: "nav" },
  { id: "tools_hub", label: "Tools hub", href: "/tools-hub", description: "All tools by sport", category: "nav" },
  { id: "profile", label: "Profile", href: "/profile", description: "Your profile", category: "nav" },
  { id: "settings", label: "Settings", href: "/settings", description: "Account settings", category: "nav" },
]

export function getQuickActions(): QuickActionItem[] {
  return [...UNIVERSAL_QUICK_ACTIONS]
}

/** Filter quick actions by query (label + description). */
export function filterQuickActionsByQuery(query: string): QuickActionItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return getQuickActions()
  return getQuickActions().filter(
    (a) =>
      a.label.toLowerCase().includes(q) ||
      (a.description?.toLowerCase().includes(q))
  )
}

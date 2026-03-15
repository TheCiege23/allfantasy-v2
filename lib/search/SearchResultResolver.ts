/**
 * SearchResultResolver — static searchable items (pages, tools) and result grouping.
 */

export type SearchResultCategory = "page" | "tool" | "league" | "player" | "quick_action"

export interface SearchResultItem {
  id: string
  label: string
  href: string
  category: SearchResultCategory
  keywords?: string[]
}

/** Static pages and destinations for universal search. */
const STATIC_PAGES: SearchResultItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", category: "page", keywords: ["home", "overview"] },
  { id: "profile", label: "Profile", href: "/profile", category: "page", keywords: ["user", "account"] },
  { id: "settings", label: "Settings", href: "/settings", category: "page", keywords: ["preferences", "account"] },
  { id: "leagues", label: "My Leagues", href: "/leagues", category: "page", keywords: ["league", "find", "discover"] },
  { id: "app", label: "WebApp", href: "/app/home", category: "page", keywords: ["sports", "app", "roster"] },
  { id: "brackets", label: "Bracket Challenge", href: "/brackets", category: "page", keywords: ["bracket", "pool", "ncaa"] },
  { id: "legacy", label: "Legacy AI", href: "/af-legacy", category: "page", keywords: ["legacy", "dynasty", "trade", "draft"] },
  { id: "tools-hub", label: "Tools Hub", href: "/tools-hub", category: "page", keywords: ["tools", "hub"] },
  { id: "chimmy", label: "Chimmy", href: "/chimmy", category: "page", keywords: ["chimmy", "ai", "chat"] },
  { id: "messages", label: "Messages", href: "/messages", category: "page", keywords: ["messages", "inbox"] },
  { id: "wallet", label: "Wallet", href: "/wallet", category: "page", keywords: ["wallet", "payments"] },
]

/** Tools with openToolHref-style entries for search. */
const STATIC_TOOLS: SearchResultItem[] = [
  { id: "trade-evaluator", label: "Trade Analyzer", href: "/trade-evaluator", category: "tool", keywords: ["trade", "analyzer", "evaluate"] },
  { id: "mock-draft", label: "Mock Draft", href: "/mock-draft", category: "tool", keywords: ["mock", "draft", "simulator"] },
  { id: "waiver-ai", label: "Waiver Advisor", href: "/waiver-ai", category: "tool", keywords: ["waiver", "wire", "advisor", "pickup"] },
  { id: "legacy-mock", label: "Draft War Room", href: "/af-legacy?tab=mock-draft", category: "tool", keywords: ["draft", "war", "room", "mock"] },
  { id: "legacy-chat", label: "AI Chat", href: "/af-legacy?tab=chat", category: "tool", keywords: ["chat", "chimmy", "ai"] },
  { id: "bracket", label: "Bracket", href: "/bracket", category: "tool", keywords: ["bracket", "challenge"] },
  { id: "power-rankings", label: "Power Rankings", href: "/app/power-rankings", category: "tool", keywords: ["power", "rankings"] },
  { id: "simulation-lab", label: "Matchup Simulator", href: "/app/simulation-lab", category: "tool", keywords: ["simulation", "matchup", "simulator"] },
]

export function getStaticSearchItems(): SearchResultItem[] {
  return [...STATIC_PAGES, ...STATIC_TOOLS]
}

/** Match query against label and keywords; return items that match. */
export function resolveStaticResults(query: string): SearchResultItem[] {
  const q = query.trim().toLowerCase()
  if (!q || q.length < 2) return []
  const items = getStaticSearchItems()
  return items.filter(
    (item) =>
      item.label.toLowerCase().includes(q) ||
      item.href.toLowerCase().includes(q) ||
      item.keywords?.some((k) => k.includes(q))
  )
}

/** Group results by category for display. */
export function groupResultsByCategory<T extends { category: SearchResultCategory }>(
  results: T[]
): Map<SearchResultCategory, T[]> {
  const map = new Map<SearchResultCategory, T[]>()
  for (const r of results) {
    const list = map.get(r.category) ?? []
    list.push(r)
    map.set(r.category, list)
  }
  const order: SearchResultCategory[] = ["quick_action", "tool", "page", "league", "player"]
  const out = new Map<SearchResultCategory, T[]>()
  for (const cat of order) {
    const list = map.get(cat)
    if (list?.length) out.set(cat, list)
  }
  for (const [cat, list] of map) {
    if (!out.has(cat)) out.set(cat, list)
  }
  return out
}

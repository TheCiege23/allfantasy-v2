/**
 * DashboardQuickActionResolver — quick action buttons for dashboard.
 */

export interface QuickActionConfig {
  id: string
  label: string
  href: string
  description: string
}

export const DASHBOARD_QUICK_ACTIONS: QuickActionConfig[] = [
  {
    id: "create_bracket_pool",
    label: "Create Bracket Pool",
    href: "/brackets/leagues/new",
    description: "Start your own challenge.",
  },
  {
    id: "open_webapp",
    label: "Open WebApp",
    href: "/app/home",
    description: "Leagues, roster, waivers, trades.",
  },
  {
    id: "open_legacy",
    label: "Open Legacy AI",
    href: "/af-legacy",
    description: "Team scan, trade center, draft war room.",
  },
]

export function getDashboardQuickActions(): QuickActionConfig[] {
  return [...DASHBOARD_QUICK_ACTIONS]
}

export type FallbackIntent =
  | "dashboard"
  | "home"
  | "create_league"
  | "import_league"
  | "join_bracket"
  | "connect_provider"
  | "ask_chimmy"
  | "explore_tools"
  | "settings"

export interface FallbackRouteSpec {
  href: string
  label: string
}

export function resolveFallbackRoute(intent: FallbackIntent): FallbackRouteSpec {
  switch (intent) {
    case "dashboard":
      return { href: "/dashboard", label: "Go to dashboard" }
    case "home":
      return { href: "/", label: "Back to home" }
    case "create_league":
      return { href: "/create-league", label: "Create league" }
    case "import_league":
      return { href: "/import", label: "Import league" }
    case "join_bracket":
      return { href: "/brackets/join", label: "Join bracket challenge" }
    case "connect_provider":
      return { href: "/settings?tab=connected", label: "Connect provider" }
    case "ask_chimmy":
      return { href: "/chimmy", label: "Ask Chimmy" }
    case "explore_tools":
      return { href: "/tools-hub", label: "Explore tools" }
    case "settings":
      return { href: "/settings", label: "Open settings" }
    default:
      return { href: "/dashboard", label: "Go to dashboard" }
  }
}

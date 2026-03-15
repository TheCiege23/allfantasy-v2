/**
 * TopBarUtilityResolver — which top bar utilities to show and in what order.
 * Used for documentation and consistent ordering (notifications, messages, AI chat, search, language, theme, admin, profile).
 */

export type TopBarUtilityId =
  | "search"
  | "wallet"
  | "messages"
  | "notifications"
  | "ai_chat"
  | "language"
  | "theme"
  | "admin"
  | "profile"

export interface TopBarUtilitySpec {
  id: TopBarUtilityId
  /** When false, hide (e.g. admin only when isAdmin). */
  visible: boolean
  /** Optional href for link-style utility. */
  href?: string
  /** Title/tooltip. */
  title: string
}

/**
 * Resolve top bar utilities for display. Order matches GlobalTopNav.
 */
export function getTopBarUtilities(opts: {
  isAuthenticated: boolean
  isAdmin: boolean
  hasSearch?: boolean
}): TopBarUtilitySpec[] {
  const { isAuthenticated, isAdmin, hasSearch = true } = opts
  if (!isAuthenticated) {
    return [
      { id: "theme", visible: true, title: "Theme" },
    ]
  }
  const list: TopBarUtilitySpec[] = [
    { id: "search", visible: !!hasSearch, title: "Search (Ctrl+K)" },
    { id: "wallet", visible: true, title: "Wallet" },
    { id: "messages", visible: true, href: "/messages", title: "Messages" },
    { id: "notifications", visible: true, title: "Notifications" },
    { id: "ai_chat", visible: true, href: "/af-legacy?tab=chat", title: "AI Chat" },
    { id: "language", visible: true, title: "Language" },
    { id: "theme", visible: true, title: "Theme" },
    { id: "admin", visible: isAdmin, href: "/admin", title: "Admin" },
    { id: "profile", visible: true, href: "/profile", title: "Profile" },
  ]
  return list.filter((u) => u.visible)
}

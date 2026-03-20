import type { ProductId } from "./ShellRouteResolver"

export interface NavItem {
  href: string
  label: string
}

/** Primary nav items for shell (tabs + mobile drawer). Synced with lib/navigation PRIMARY_NAV_ITEMS + admin when isAdmin. */
export const SHELL_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/profile", label: "Profile" },
  { href: "/app", label: "WebApp" },
  { href: "/brackets", label: "Bracket" },
  { href: "/tools-hub", label: "Tools" },
  { href: "/messages", label: "Messages" },
  { href: "/wallet", label: "Wallet" },
  { href: "/settings", label: "Settings" },
]

export const PRODUCT_SWITCHER_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Home" },
  { href: "/app", label: "WebApp" },
  { href: "/brackets", label: "Bracket" },
]

/**
 * Returns whether the given pathname matches href (exact or prefix).
 */
export function isNavItemActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false
  if (pathname === href) return true
  if (href === "/dashboard" && pathname === "/") return false
  if (href === "/tools-hub") return pathname === "/tools-hub" || pathname.startsWith("/tools/")
  return pathname.startsWith(`${href}/`)
}

/**
 * Resolves which nav item is active for the current pathname.
 */
export function getActiveNavHref(pathname: string | null): string | null {
  if (!pathname) return null
  for (const item of SHELL_NAV_ITEMS) {
    if (isNavItemActive(pathname, item.href)) return item.href
  }
  if (pathname.startsWith("/admin")) return "/admin"
  if (pathname.startsWith("/tools-hub") || pathname.startsWith("/tools/")) return "/tools-hub"
  return null
}

export type { ProductId }

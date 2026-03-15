/**
 * Resolves visibility of admin-only navigation (link/tab in header and mobile drawer).
 * Server-side admin resolution is in lib/auth/admin (resolveAdminEmail).
 * This module provides the client/resolver contract for nav visibility.
 */

import { ADMIN_NAV_ITEM, type NavLinkItem } from "./NavLinkResolver"

/** Whether to show the admin nav link/tab. */
export function showAdminNav(isAdmin: boolean): boolean {
  return Boolean(isAdmin)
}

/** Admin nav item for rendering; only meaningful when showAdminNav(true). */
export function getAdminNavItem(): NavLinkItem {
  return ADMIN_NAV_ITEM
}

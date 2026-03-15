/**
 * ProductSwitchController — resolve target route when switching product.
 * Ensures product switcher and nav links use canonical entry routes.
 */

import { getProductNavItems } from "@/lib/navigation"
import { getProductEntryRoute } from "./CrossProductRouteResolver"
import type { ProductId } from "@/lib/shell"

/** Get the href to use when switching to a product (for links and redirects). */
export function getProductSwitchHref(productId: ProductId): string {
  return getProductEntryRoute(productId)
}

/** All switch targets (same order as nav: Home, WebApp, Bracket, Legacy). */
export function getProductSwitchItems(): { productId: ProductId; href: string; label: string }[] {
  const items = getProductNavItems()
  const productIds: ProductId[] = ["home", "webapp", "bracket", "legacy"]
  return items.map((item, i) => ({
    productId: productIds[i] ?? "home",
    href: item.href,
    label: item.label,
  }))
}

/** Resolve switch target for a product (for redirects or programmatic nav). */
export function getSwitchTargetFromPath(_pathname: string | null, targetProductId: ProductId): string {
  return getProductSwitchHref(targetProductId)
}

"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { getProductSwitchItems, isPathInProduct } from "@/lib/routing"

export default function ProductSwitcher() {
  const pathname = usePathname()
  const products = getProductSwitchItems()
  return (
    <nav className="hidden items-center gap-1 md:flex" aria-label="Product switcher">
      {products.map((item) => {
        const active = isPathInProduct(pathname, item.productId)
        return (
          <Link
            key={item.productId}
            href={item.href}
            className="rounded-lg px-2.5 py-1.5 text-xs transition"
            aria-current={active ? "page" : undefined}
            style={active
              ? { background: "color-mix(in srgb, var(--accent-cyan) 20%, transparent)", color: "var(--accent-cyan-strong)" }
              : { color: "var(--muted)", background: "transparent" }}
          >
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}


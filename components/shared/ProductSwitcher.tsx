"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { getProductNavItems } from "@/lib/navigation"
import { isNavItemActive } from "@/lib/shell"

export default function ProductSwitcher() {
  const pathname = usePathname()
  const products = getProductNavItems()
  return (
    <div className="hidden items-center gap-1 md:flex">
      {products.map((item) => {
        const active = isNavItemActive(pathname, item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-lg px-2.5 py-1.5 text-xs transition"
            style={active
              ? { background: "color-mix(in srgb, var(--accent-cyan) 20%, transparent)", color: "var(--accent-cyan-strong)" }
              : { color: "var(--muted)", background: "transparent" }}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}


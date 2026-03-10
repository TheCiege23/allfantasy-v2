"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const PRODUCTS = [
  { href: "/dashboard", label: "Home" },
  { href: "/app", label: "WebApp" },
  { href: "/brackets", label: "Bracket" },
  { href: "/af-legacy", label: "Legacy" },
] as const

export default function ProductSwitcher() {
  const pathname = usePathname()
  return (
    <div className="hidden items-center gap-1 md:flex">
      {PRODUCTS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
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

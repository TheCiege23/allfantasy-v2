"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { X, Shield } from "lucide-react"
import { SHELL_NAV_ITEMS, isNavItemActive } from "@/lib/shell"
import { showAdminNav } from "@/lib/navigation"

export interface MobileNavigationDrawerProps {
  open: boolean
  onClose: () => void
  isAdmin?: boolean
}

export function MobileNavigationDrawer({
  open,
  onClose,
  isAdmin = false,
}: MobileNavigationDrawerProps) {
  const pathname = usePathname()

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 transition-opacity lg:hidden"
        aria-hidden
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 z-50 h-full w-[min(100vw-2rem,280px)] border-l shadow-xl transition-transform lg:hidden"
        style={{
          background: "var(--panel)",
          borderColor: "var(--border)",
          transform: open ? "translateX(0)" : "translateX(100%)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--text)" }}>Menu</span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-lg border"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 space-y-1">
            {SHELL_NAV_ITEMS.map((item) => {
              const active = isNavItemActive(pathname, item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium transition"
                  style={{
                    background: active ? "color-mix(in srgb, var(--accent-cyan) 18%, transparent)" : "transparent",
                    color: active ? "var(--accent-cyan-strong)" : "var(--text)",
                  }}
                >
                  {item.label}
                </Link>
              )
            })}
            {showAdminNav(isAdmin) && (
              <Link
                href="/admin"
                onClick={onClose}
                className="block rounded-lg px-3 py-2.5 text-sm font-medium transition"
                style={{
                  background: pathname?.startsWith("/admin") ? "color-mix(in srgb, var(--accent-amber) 18%, transparent)" : "transparent",
                  color: pathname?.startsWith("/admin") ? "var(--accent-amber-strong)" : "var(--text)",
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Admin
                </span>
              </Link>
            )}
          </nav>
        </div>
      </aside>
    </>
  )
}

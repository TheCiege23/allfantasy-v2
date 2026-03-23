"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageCircle, Shield, Sparkles, Menu, Search } from "lucide-react"
import { loginUrlWithIntent, signupUrlWithIntent } from "@/lib/auth/auth-intent-resolver"
import ProductSwitcher from "@/components/shared/ProductSwitcher"
import NotificationBell from "@/components/shared/NotificationBell"
import WalletSummaryBadge from "@/components/shared/WalletSummaryBadge"
import { ModeToggle } from "@/components/theme/ModeToggle"
import LanguageToggle from "@/components/i18n/LanguageToggle"
import { UserMenuDropdown } from "@/components/navigation/UserMenuDropdown"
import { getPrimaryNavItems } from "@/lib/navigation"
import { showAdminNav } from "@/lib/navigation"
import { isNavItemActive } from "@/lib/shell"
import { getPrimaryChimmyEntry } from "@/lib/ai-product-layer"

type Props = {
  isAuthenticated: boolean
  isAdmin?: boolean
  userLabel?: string | null
  onOpenMobileMenu?: () => void
  onOpenSearch?: () => void
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ")
}

export default function GlobalTopNav({ isAuthenticated, isAdmin = false, userLabel, onOpenMobileMenu, onOpenSearch }: Props) {
  const pathname = usePathname()
  const chimmyEntry = getPrimaryChimmyEntry()
  const primaryItems = getPrimaryNavItems(isAdmin)

  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-xl transition-colors mode-panel" style={{ background: "color-mix(in srgb, var(--panel) 88%, transparent)", borderColor: "var(--border)" }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {onOpenMobileMenu && (
            <button
              type="button"
              onClick={onOpenMobileMenu}
              className="flex lg:hidden h-9 w-9 items-center justify-center rounded-lg border"
              style={{ borderColor: "var(--border)", color: "var(--muted)" }}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          )}
          <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex shrink-0 items-center gap-2">
            <div className="mode-image-safe h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500" />
            <span className="text-sm font-bold tracking-wide mode-text">AllFantasy.ai</span>
          </Link>

          <ProductSwitcher />

          <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:gap-2">
            {isAuthenticated ? (
              <>
                {onOpenSearch && (
                  <button
                    type="button"
                    onClick={onOpenSearch}
                    className="rounded-lg border p-2 transition"
                    style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel2) 82%, transparent)", color: "var(--muted)" }}
                    title="Search (Ctrl+K)"
                    aria-label="Search"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                )}
                <WalletSummaryBadge />
                <Link href="/messages" className="rounded-lg border p-2 transition" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel2) 82%, transparent)", color: "var(--text)" }} title="Messages">
                  <MessageCircle className="h-4 w-4" />
                </Link>
                <NotificationBell />
                <Link href={chimmyEntry.href} className="rounded-lg border p-2 transition hover:opacity-90" style={{ borderColor: "color-mix(in srgb, var(--accent-cyan) 45%, var(--border))", background: "color-mix(in srgb, var(--accent-cyan) 14%, transparent)", color: "var(--accent-cyan-strong)" }} title={chimmyEntry.label}>
                  <Sparkles className="h-4 w-4" />
                </Link>
                <div className="hidden sm:inline-flex">
                  <LanguageToggle />
                </div>
                <ModeToggle className="rounded-lg border px-2.5 py-2 text-xs font-semibold transition" />
                {showAdminNav(isAdmin) && (
                  <Link href="/admin" className="rounded-lg border p-2 transition hover:opacity-90" style={{ borderColor: "color-mix(in srgb, var(--accent-amber) 45%, var(--border))", background: "color-mix(in srgb, var(--accent-amber) 14%, transparent)", color: "var(--accent-amber-strong)" }} title="Admin">
                    <Shield className="h-4 w-4" />
                  </Link>
                )}
                <UserMenuDropdown userLabel={userLabel} />
              </>
            ) : (
              <>
                <ModeToggle className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition" />
                <Link href={loginUrlWithIntent(pathname || "/dashboard")} className="rounded-lg border px-3 py-1.5 text-sm transition" style={{ borderColor: "var(--border)", color: "var(--text)", background: "color-mix(in srgb, var(--panel2) 82%, transparent)" }}>Login</Link>
                <Link href={signupUrlWithIntent(pathname || "/dashboard")} className="rounded-lg px-3 py-1.5 text-sm font-semibold transition" style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}>Sign Up</Link>
              </>
            )}
          </div>
        </div>

        {isAuthenticated && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {primaryItems.map((item) => {
            const active = item.href === "/admin" ? pathname.startsWith("/admin") : isNavItemActive(pathname, item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn("whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] transition sm:px-3 sm:text-xs")}
                style={active
                  ? { background: "var(--text)", color: "var(--bg)" }
                  : { background: "color-mix(in srgb, var(--panel2) 80%, transparent)", color: "var(--muted)" }}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
        )}
      </div>
    </header>
  )
}


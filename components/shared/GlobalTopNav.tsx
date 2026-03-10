"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageCircle, Shield, Sparkles } from "lucide-react"
import ProductSwitcher from "@/components/shared/ProductSwitcher"
import NotificationBell from "@/components/shared/NotificationBell"
import WalletSummaryBadge from "@/components/shared/WalletSummaryBadge"
import { ModeToggle } from "@/components/theme/ModeToggle"

type Props = {
  isAuthenticated: boolean
  isAdmin?: boolean
  userLabel?: string | null
}

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ")
}

const GLOBAL_TABS = [
  ["/dashboard", "Home"],
  ["/app", "WebApp"],
  ["/brackets", "Bracket"],
  ["/af-legacy", "Legacy"],
  ["/messages", "Messages"],
  ["/wallet", "Wallet"],
  ["/settings", "Settings"],
] as const

export default function GlobalTopNav({ isAuthenticated, isAdmin = false, userLabel }: Props) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-xl transition-colors mode-panel" style={{ background: "color-mix(in srgb, var(--panel) 88%, transparent)", borderColor: "var(--border)" }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div className="mode-image-safe h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500" />
            <span className="text-sm font-bold tracking-wide mode-text">AllFantasy.ai</span>
          </Link>

          <ProductSwitcher />

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <WalletSummaryBadge />
                <Link href="/messages" className="rounded-lg border p-2 transition" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel2) 82%, transparent)", color: "var(--text)" }} title="Messages">
                  <MessageCircle className="h-4 w-4" />
                </Link>
                <NotificationBell />
                <Link href="/af-legacy?tab=chat" className="rounded-lg border p-2 transition hover:opacity-90" style={{ borderColor: "color-mix(in srgb, var(--accent-cyan) 45%, var(--border))", background: "color-mix(in srgb, var(--accent-cyan) 14%, transparent)", color: "var(--accent-cyan-strong)" }} title="AI Chat">
                  <Sparkles className="h-4 w-4" />
                </Link>
                <ModeToggle className="rounded-lg border px-2.5 py-2 text-xs font-semibold transition" />
                {isAdmin && (
                  <Link href="/admin" className="rounded-lg border p-2 transition hover:opacity-90" style={{ borderColor: "color-mix(in srgb, var(--accent-amber) 45%, var(--border))", background: "color-mix(in srgb, var(--accent-amber) 14%, transparent)", color: "var(--accent-amber-strong)" }} title="Admin">
                    <Shield className="h-4 w-4" />
                  </Link>
                )}
                <div className="rounded-lg border px-2.5 py-1.5 text-xs" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel2) 82%, transparent)", color: "var(--text)" }}>
                  {userLabel || "User"}
                </div>
              </>
            ) : (
              <>
                <ModeToggle className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition" />
                <Link href="/login" className="rounded-lg border px-3 py-1.5 text-sm transition" style={{ borderColor: "var(--border)", color: "var(--text)", background: "color-mix(in srgb, var(--panel2) 82%, transparent)" }}>Login</Link>
                <Link href="/signup" className="rounded-lg px-3 py-1.5 text-sm font-semibold transition" style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}>Sign Up</Link>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto">
          {GLOBAL_TABS.map(([href, label]) => {
            const active = pathname === href || pathname.startsWith(`${href}/`)
            return (
              <Link
                key={href}
                href={href}
                className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition")}
                style={active
                  ? { background: "var(--text)", color: "var(--bg)" }
                  : { background: "color-mix(in srgb, var(--panel2) 80%, transparent)", color: "var(--muted)" }}
              >
                {label}
              </Link>
            )
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition"
              style={pathname.startsWith("/admin")
                ? { background: "var(--text)", color: "var(--bg)" }
                : { background: "color-mix(in srgb, var(--panel2) 80%, transparent)", color: "var(--muted)" }}
            >
              Admin
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

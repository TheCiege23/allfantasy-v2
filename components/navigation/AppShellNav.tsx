"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageCircle, Shield, Wallet, Sparkles } from "lucide-react"
import { ModeToggle } from "@/components/theme/ModeToggle"

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ")
}

type AppShellNavProps = {
  isAuthenticated: boolean
  isAdmin?: boolean
  userLabel?: string | null
  balanceLabel?: string
  winningsLabel?: string
}

const PRODUCT_TABS = [
  { href: "/brackets", label: "Bracket" },
  { href: "/app", label: "WebApp" },
  { href: "/af-legacy", label: "Legacy" },
] as const

const GLOBAL_TABS = [
  { href: "/dashboard", label: "Home" },
  { href: "/brackets", label: "Bracket" },
  { href: "/app", label: "WebApp" },
  { href: "/af-legacy", label: "Legacy" },
  { href: "/messages", label: "Messages" },
  { href: "/wallet", label: "Wallet" },
  { href: "/settings", label: "Settings" },
] as const

export default function AppShellNav({
  isAuthenticated,
  isAdmin = false,
  userLabel,
  balanceLabel = "$0.00",
  winningsLabel = "$0.00",
}: AppShellNavProps) {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-40 border-b backdrop-blur-xl mode-panel" style={{ background: "color-mix(in srgb, var(--panel) 88%, transparent)", borderColor: "var(--border)" }}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex shrink-0 items-center gap-2">
            <div className="mode-image-safe h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500" />
            <span className="text-sm font-bold tracking-wide mode-text">AllFantasy.ai</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {PRODUCT_TABS.map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn("rounded-lg px-2.5 py-1.5 text-xs transition")}
                  style={active
                    ? { background: "color-mix(in srgb, var(--accent-cyan) 20%, transparent)", color: "var(--accent-cyan-strong)" }
                    : { color: "var(--muted)", background: "transparent" }}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>

          <div className="ml-auto flex w-full flex-wrap items-center justify-end gap-1.5 sm:w-auto sm:gap-2">
            {isAuthenticated ? (
              <>
                <Link
                  href="/wallet/deposit"
                  className="hidden items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs sm:flex"
                  style={{ borderColor: "color-mix(in srgb, var(--accent-emerald) 45%, var(--border))", background: "color-mix(in srgb, var(--accent-emerald) 14%, transparent)", color: "var(--accent-emerald-strong)" }}
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Deposit
                </Link>
                <div className="hidden rounded-lg border px-2.5 py-1.5 text-xs sm:block" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel2) 82%, transparent)", color: "var(--text)" }}>
                  Bal: {balanceLabel}
                </div>
                <div className="hidden rounded-lg border px-2.5 py-1.5 text-xs lg:block" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel2) 82%, transparent)", color: "var(--text)" }}>
                  Winnings: {winningsLabel}
                </div>
                <Link
                  href="/messages"
                  className="rounded-lg border p-2 transition"
                  style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel2) 82%, transparent)", color: "var(--text)" }}
                  title="Messages"
                >
                  <MessageCircle className="h-4 w-4" />
                </Link>
                <Link
                  href="/af-legacy?tab=chat"
                  className="rounded-lg border p-2 transition hover:opacity-90"
                  style={{ borderColor: "color-mix(in srgb, var(--accent-cyan) 45%, var(--border))", background: "color-mix(in srgb, var(--accent-cyan) 14%, transparent)", color: "var(--accent-cyan-strong)" }}
                  title="AI Chat"
                >
                  <Sparkles className="h-4 w-4" />
                </Link>
                <ModeToggle className="rounded-lg border px-2.5 py-2 text-xs font-semibold transition" />
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="rounded-lg border p-2 transition hover:opacity-90"
                    style={{ borderColor: "color-mix(in srgb, var(--accent-amber) 45%, var(--border))", background: "color-mix(in srgb, var(--accent-amber) 14%, transparent)", color: "var(--accent-amber-strong)" }}
                    title="Admin"
                  >
                    <Shield className="h-4 w-4" />
                  </Link>
                )}
                <div className="hidden rounded-lg border px-2.5 py-1.5 text-xs lg:block" style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel2) 82%, transparent)", color: "var(--text)" }}>
                  {userLabel || "User"}
                </div>
              </>
            ) : (
              <>
                <ModeToggle className="rounded-lg border px-3 py-1.5 text-sm font-semibold transition" />
                <Link href="/login" className="rounded-lg border px-3 py-1.5 text-sm transition" style={{ borderColor: "var(--border)", color: "var(--text)", background: "color-mix(in srgb, var(--panel2) 82%, transparent)" }}>
                  Login
                </Link>
                <Link href="/signup" className="rounded-lg px-3 py-1.5 text-sm font-semibold transition" style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}>
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {GLOBAL_TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] transition sm:px-3 sm:text-xs"
                style={active
                  ? { background: "var(--text)", color: "var(--bg)" }
                  : { background: "color-mix(in srgb, var(--panel2) 80%, transparent)", color: "var(--muted)" }}
              >
                {tab.label}
              </Link>
            )
          })}
          {isAdmin && (
            <Link
              href="/admin"
              className="whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] transition sm:px-3 sm:text-xs"
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


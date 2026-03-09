"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MessageCircle, Shield, Wallet, Sparkles } from "lucide-react"

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
  { href: "/bracket", label: "NCAA Bracket" },
  { href: "/app", label: "WebApp" },
  { href: "/legacy", label: "AF Legacy" },
] as const

const PRIMARY_TABS = [
  { href: "/dashboard", label: "Home" },
  { href: "/leagues", label: "Leagues" },
  { href: "/messages", label: "Messages" },
  { href: "/legacy", label: "Legacy" },
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
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 via-purple-500 to-pink-500" />
            <span className="text-sm font-bold tracking-wide text-white">AllFantasy.ai</span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {PRODUCT_TABS.map((tab) => {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "rounded-lg px-2.5 py-1.5 text-xs transition",
                    active ? "bg-cyan-500/20 text-cyan-200" : "text-white/65 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  href="/wallet/deposit"
                  className="hidden items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs text-emerald-300 sm:flex"
                >
                  <Wallet className="h-3.5 w-3.5" />
                  Deposit
                </Link>
                <div className="hidden rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 sm:block">
                  Bal: {balanceLabel}
                </div>
                <div className="hidden rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/80 lg:block">
                  Winnings: {winningsLabel}
                </div>
                <Link
                  href="/messages"
                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/80 transition hover:bg-white/10"
                  title="Messages"
                >
                  <MessageCircle className="h-4 w-4" />
                </Link>
                <Link
                  href="/legacy?tab=chat"
                  className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-2 text-cyan-300 transition hover:bg-cyan-500/20"
                  title="AI Chat"
                >
                  <Sparkles className="h-4 w-4" />
                </Link>
                {isAdmin && (
                  <Link
                    href="/admin"
                    className="rounded-lg border border-amber-400/30 bg-amber-500/10 p-2 text-amber-300 transition hover:bg-amber-500/20"
                    title="Admin"
                  >
                    <Shield className="h-4 w-4" />
                  </Link>
                )}
                <div className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white/90">
                  {userLabel || "User"}
                </div>
              </>
            ) : (
              <>
                <Link href="/login" className="rounded-lg border border-white/20 px-3 py-1.5 text-sm text-white/90 hover:bg-white/10">
                  Login
                </Link>
                <Link href="/signup" className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-black hover:bg-slate-200">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto">
          {PRIMARY_TABS.map((tab) => {
            const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition",
                  active ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10",
                )}
              >
                {tab.label}
              </Link>
            )
          })}
          <Link
            href="/wallet"
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition",
              pathname === "/wallet" || pathname.startsWith("/wallet/") ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10",
            )}
          >
            Wallet
          </Link>
          <Link
            href="/settings"
            className={cn(
              "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition",
              pathname === "/settings" || pathname.startsWith("/settings/") ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10",
            )}
          >
            Settings
          </Link>
          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-xs transition",
                pathname.startsWith("/admin") ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10",
              )}
            >
              Admin
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}

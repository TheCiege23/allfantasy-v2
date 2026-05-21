"use client"

import Link from "next/link"
import Image from "next/image"
import { useSession } from "next-auth/react"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import NotificationBell from "@/components/shared/NotificationBell"
import LanguageToggle from "@/components/i18n/LanguageToggle"
import { UserMenuDropdown } from "@/components/navigation/UserMenuDropdown"
import { loginUrlWithIntent, signupUrlWithIntent } from "@/lib/auth/auth-intent-resolver"

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/af-legacy", label: "Legacy" },
] as const

export function BracketsPageHeader() {
  const { data: session, status } = useSession()
  const isAuthenticated = status === "authenticated" && Boolean(session?.user)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl"
        style={{
          background: "color-mix(in srgb, var(--panel) 88%, transparent)",
          borderColor: "var(--border)",
        }}
      >
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-3 px-4 py-2.5 sm:px-6">

          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border sm:hidden"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>

          {/* AllFantasy wordmark */}
          <Link
            href={isAuthenticated ? "/dashboard" : "/"}
            className="flex shrink-0 items-center"
            aria-label="AllFantasy home"
          >
            <Image
              src="/brand/allfantasy-wordmark-transparent.png"
              alt="AllFantasy"
              width={150}
              height={34}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>

          {/* Desktop nav links */}
          <nav className="ml-2 hidden items-center gap-0.5 sm:flex" aria-label="Brackets navigation">
            {NAV_LINKS.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-all hover:opacity-90"
                style={{
                  color: "var(--muted)",
                  background: "color-mix(in srgb, var(--panel2) 68%, transparent)",
                }}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side — notifications, language, profile */}
          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            {status === "loading" ? null : isAuthenticated ? (
              <>
                <NotificationBell />
                <div className="hidden sm:block">
                  <LanguageToggle />
                </div>
                <UserMenuDropdown userLabel={session?.user?.name ?? null} />
              </>
            ) : (
              <>
                <div className="hidden sm:block">
                  <LanguageToggle />
                </div>
                <Link
                  href={loginUrlWithIntent("/brackets")}
                  className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-90"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text)",
                    background: "color-mix(in srgb, var(--panel2) 82%, transparent)",
                  }}
                >
                  Login
                </Link>
                <Link
                  href={signupUrlWithIntent("/brackets")}
                  className="rounded-lg px-3 py-1.5 text-xs font-bold transition hover:opacity-90"
                  style={{
                    background: "var(--accent-cyan-strong)",
                    color: "var(--on-accent-bg)",
                  }}
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Mobile nav drawer */}
        {mobileOpen && (
          <div
            className="border-t px-4 pb-3 pt-2 sm:hidden"
            style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel) 95%, transparent)" }}
          >
            <nav className="flex flex-col gap-1" aria-label="Mobile brackets navigation">
              {NAV_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-sm font-semibold transition hover:opacity-90"
                  style={{
                    color: "var(--text)",
                    background: "color-mix(in srgb, var(--panel2) 70%, transparent)",
                  }}
                >
                  {label}
                </Link>
              ))}
              <div className="mt-2 border-t pt-2" style={{ borderColor: "var(--border)" }}>
                <LanguageToggle />
              </div>
            </nav>
          </div>
        )}
      </header>
    </>
  )
}

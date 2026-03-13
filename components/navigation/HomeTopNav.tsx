"use client"

import Link from "next/link"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { ModeToggle } from "@/components/theme/ModeToggle"
import NotificationBell from "@/components/shared/NotificationBell"
import SettingsModal from "@/components/navigation/SettingsModal"
import { ChevronDown, Search, MessageCircle, Bot, Settings as SettingsIcon } from "lucide-react"

const MOCK_LEAGUES = [
  { id: "all", name: "All Leagues" },
  { id: "sports-app", name: "Sports App" },
  { id: "bracket", name: "Bracket Challenge" },
  { id: "legacy", name: "AF Legacy" },
]

export default function HomeTopNav() {
  const { data: session } = useSession()
  const [leagueId, setLeagueId] = useState("all")
  const [settingsOpen, setSettingsOpen] = useState(false)

  const username =
    (session?.user as any)?.username ||
    session?.user?.name ||
    (session?.user?.email ? session.user.email.split("@")[0] : "Guest")

  return (
    <>
      <header
        className="w-full border-b px-3 sm:px-4"
        style={{ borderColor: "color-mix(in srgb, var(--border) 85%, transparent)" }}
      >
        <div className="mx-auto flex max-w-6xl items-center gap-2 py-2 sm:py-3">
          {/* Left: logo + league switch */}
          <div className="flex items-center gap-3 min-w-0">
            <Link href="/" className="flex items-center gap-2 min-w-0">
              <img
                src="/af-crest.png"
                alt="AllFantasy crest"
                className="h-8 w-8 rounded-lg border bg-black/40 object-contain mode-image-safe"
                style={{ borderColor: "var(--border)" }}
              />
              <span className="hidden text-sm font-semibold tracking-tight sm:inline-block" style={{ color: "var(--text)" }}>
                AllFantasy
              </span>
            </Link>
            <div className="relative hidden md:flex items-center">
              <select
                value={leagueId}
                onChange={(e) => setLeagueId(e.target.value)}
                className="appearance-none rounded-xl border bg-transparent pl-3 pr-7 py-1.5 text-xs outline-none"
                style={{
                  borderColor: "var(--border)",
                  color: "var(--muted)",
                  background: "color-mix(in srgb, var(--panel2) 82%, transparent)",
                }}
              >
                {MOCK_LEAGUES.map((lg) => (
                  <option key={lg.id} value={lg.id}>
                    {lg.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 h-3.5 w-3.5 text-[rgba(148,163,184,0.9)]" />
            </div>
          </div>

          {/* Center: search bar */}
          <div className="flex-1 min-w-0 hidden sm:flex items-center justify-center px-2">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgba(148,163,184,0.9)]" />
              <input
                type="text"
                placeholder="Search players, leagues, brackets, tools…"
                className="w-full rounded-full pl-9 pr-3 py-1.5 text-xs outline-none"
                style={{
                  background: "color-mix(in srgb, var(--panel2) 90%, transparent)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>
          </div>

          {/* Right: user + actions */}
          <div className="flex items-center gap-1 sm:gap-2 ml-auto">
            <div className="hidden sm:flex items-center gap-2 pr-2 border-r" style={{ borderColor: "var(--border)" }}>
              <span className="max-w-[120px] truncate text-xs font-medium" style={{ color: "var(--muted)" }}>
                {username}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border"
              style={{
                borderColor: "var(--border)",
                background: "color-mix(in srgb, var(--panel2) 84%, transparent)",
                color: "var(--muted2)",
              }}
              aria-label="Open settings"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>

            <div className="hidden md:inline-flex">
              <ModeToggle className="rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold" />
            </div>

            <NotificationBell />

            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border"
              style={{
                borderColor: "var(--border)",
                background: "color-mix(in srgb, var(--panel2) 84%, transparent)",
                color: "var(--muted2)",
              }}
              aria-label="Direct messages"
            >
              <MessageCircle className="h-4 w-4" />
            </button>

            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border"
              style={{
                borderColor: "var(--border)",
                background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
                color: "var(--on-accent-bg)",
              }}
              aria-label="Open AI assistant"
            >
              <Bot className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile search + league switch */}
        <div className="flex flex-col gap-2 pb-2 sm:hidden">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgba(148,163,184,0.9)]" />
              <input
                type="text"
                placeholder="Search AllFantasy…"
                className="w-full rounded-full pl-9 pr-3 py-1.5 text-xs outline-none"
                style={{
                  background: "color-mix(in srgb, var(--panel2) 90%, transparent)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>
            <ModeToggle className="inline-flex h-8 w-8 items-center justify-center rounded-lg border text-[11px]" />
          </div>
          <div className="relative">
            <select
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              className="w-full appearance-none rounded-xl border bg-transparent pl-3 pr-7 py-1.5 text-xs outline-none"
              style={{
                borderColor: "var(--border)",
                color: "var(--muted)",
                background: "color-mix(in srgb, var(--panel2) 82%, transparent)",
              }}
            >
              {MOCK_LEAGUES.map((lg) => (
                <option key={lg.id} value={lg.id}>
                  {lg.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[rgba(148,163,184,0.9)]" />
          </div>
        </div>
      </header>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} username={username} />
    </>
  )
}


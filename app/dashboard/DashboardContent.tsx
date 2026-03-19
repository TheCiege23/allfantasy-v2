"use client"

import Image from "next/image"
import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Flame,
  Hash,
  Inbox,
  MessageCircle,
  Plus,
  Search,
  Settings,
  Sparkles,
  Trophy,
} from "lucide-react"
import { XP_PER_LEVEL, levelFromXp, tierFromLevel } from "@/lib/ranking/config"

interface DashboardProps {
  onboardingComplete?: boolean
  checklistState?: unknown
  retentionNudges?: unknown[]
  user: {
    id: string
    username: string | null
    displayName: string | null
    email: string
    emailVerified: boolean
    avatarUrl: string | null
  }
  profile: {
    sleeperUsername: string | null
    isVerified: boolean
    isAgeConfirmed: boolean
    profileComplete: boolean
  }
  leagues: {
    id: string
    name: string
    tournamentId: string
    memberCount: number
    leagueTier: number
    inTierRange: boolean
  }[]
  userCareerTier?: number
  entries: {
    id: string
    name: string
    tournamentId: string
    score: number
  }[]
  isAdmin?: boolean
}

const dmThreads = [
  { id: "dm-ai", name: "Chimmy AI", badge: 2, online: true },
  { id: "dm-1", name: "Commish Crew", badge: 5, online: true },
  { id: "dm-2", name: "Trade Desk", badge: 0, online: true },
]

const mentionFeed = [
  "@you lineup reminder for tonight",
  "@you trade vote closes in 2h",
  "@you waivers run at 3:00 AM",
]

type ChatThreadApi = {
  id: string
  threadType: "dm" | "group" | "league" | "bracket_pool" | "ai"
  title: string
  unreadCount?: number
}

type SidebarThread = {
  id: string
  name: string
  badge: number
  online: boolean
}

type LeagueChatMessageVm = {
  id: string
  author: string
  text: string
  meta: string
}

function formatRelativeTime(value: string | Date | null | undefined): string {
  if (!value) return "just now"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "just now"
  const diffMs = Date.now() - date.getTime()
  const diffMin = Math.max(0, Math.floor(diffMs / 60000))
  if (diffMin < 1) return "just now"
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

function normalizeLeagueMessage(raw: any): LeagueChatMessageVm | null {
  const text = String(raw?.message ?? raw?.body ?? "").trim()
  if (!text) return null
  const author =
    raw?.user?.displayName ||
    raw?.user?.username ||
    raw?.user?.email ||
    raw?.senderName ||
    "Manager"
  const id = String(raw?.id ?? `${author}-${raw?.createdAt ?? Math.random()}`)
  return {
    id,
    author,
    text,
    meta: formatRelativeTime(raw?.createdAt),
  }
}

const forumTopics = [
  { id: "f-1", title: "Week 7 upset watch", meta: "Trending now", href: "/feed" },
  { id: "f-2", title: "Commissioner rule proposals", meta: "Community topic", href: "/feed" },
  { id: "f-3", title: "Draft pick value thread", meta: "Most discussed", href: "/feed" },
]

type FeedTopicItem = {
  id: string
  title: string
  body?: string
  href?: string
}

type LeagueFeedEvent = {
  id: string
  title: string
  message?: string
}

type ForumTopic = {
  id: string
  title: string
  meta: string
  href: string
}

const quickLegacyTools = [
  { name: "Trade Hub", href: "/af-legacy?tab=trade" },
  { name: "Waiver AI", href: "/af-legacy?tab=waiver" },
  { name: "Rankings", href: "/af-legacy?tab=rankings" },
  { name: "Chimmy Coach", href: "/af-legacy?tab=chat" },
  { name: "Mock Draft", href: "/af-legacy?tab=mock-draft" },
]

export default function DashboardContent({ user, profile, leagues, entries, userCareerTier }: DashboardProps) {
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(leagues[0]?.id ?? null)
  const [liveDmThreads, setLiveDmThreads] = useState<SidebarThread[]>(dmThreads)
  const [liveMentionFeed, setLiveMentionFeed] = useState<string[]>(mentionFeed)
  const [chatMessages, setChatMessages] = useState<LeagueChatMessageVm[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [composer, setComposer] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [liveForumTopics, setLiveForumTopics] = useState<ForumTopic[]>(forumTopics)

  const visibleLeagues = useMemo(() => leagues.filter((league) => league.inTierRange !== false), [leagues])
  const lockedLeagues = useMemo(() => leagues.filter((league) => league.inTierRange === false), [leagues])

  const selectedLeague = useMemo(
    () => visibleLeagues.find((l) => l.id === selectedLeagueId) ?? visibleLeagues[0] ?? null,
    [visibleLeagues, selectedLeagueId]
  )

  useEffect(() => {
    if (!selectedLeagueId && visibleLeagues[0]?.id) {
      setSelectedLeagueId(visibleLeagues[0].id)
      return
    }

    const stillVisible = visibleLeagues.some((l) => l.id === selectedLeagueId)
    if (!stillVisible) {
      setSelectedLeagueId(visibleLeagues[0]?.id ?? null)
    }
  }, [selectedLeagueId, visibleLeagues])

  const displayName = user.displayName || user.username || user.email.split("@")[0] || "Manager"

  const ranking = useMemo(() => {
    const basePower =
      leagues.length * 3 +
      entries.length * 2 +
      (profile.profileComplete ? 10 : 0) +
      (profile.isVerified ? 10 : 0) +
      (profile.isAgeConfirmed ? 5 : 0)
    const legacyPowerScore = Math.max(1, Math.min(100, Math.round(basePower)))
    const pointsFromEntries = entries.reduce((sum, e) => sum + Math.max(0, e.score || 0), 0)
    const xp = legacyPowerScore * 120 + pointsFromEntries * 6
    const level = levelFromXp(xp)
    const tier = tierFromLevel(level)
    const nextLevelXp = (level + 1) * XP_PER_LEVEL
    const currentLevelXp = level * XP_PER_LEVEL
    const progressPct =
      nextLevelXp === currentLevelXp
        ? 0
        : Math.round(((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100)

    return {
      legacyPowerScore,
      xp,
      level,
      tier,
      progressPct: Math.max(0, Math.min(100, progressPct)),
      nextLevelXp,
    }
  }, [leagues.length, entries, profile.isAgeConfirmed, profile.isVerified, profile.profileComplete])

  const effectiveCareerTier = Number.isFinite(Number(userCareerTier))
    ? Math.max(1, Math.floor(Number(userCareerTier)))
    : ranking.tier.tier

  const loadSidebarThreads = useCallback(async () => {
    try {
      const res = await fetch("/api/shared/chat/threads", { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      const threads = Array.isArray(data?.threads) ? (data.threads as ChatThreadApi[]) : []

      const mappedThreads: SidebarThread[] = threads
        .filter((t) => t.threadType === "dm" || t.threadType === "group" || t.threadType === "ai")
        .slice(0, 8)
        .map((t) => ({
          id: t.id,
          name: (t.title || "Chat Thread").trim(),
          badge: Number(t.unreadCount || 0),
          online: t.threadType === "ai" || t.threadType === "dm",
        }))

      const hasChimmy = mappedThreads.some((t) => /chimmy/i.test(t.name))
      if (!hasChimmy) {
        mappedThreads.unshift({ id: "chimmy-ai", name: "Chimmy AI", badge: 0, online: true })
      }

      if (mappedThreads.length > 0) {
        setLiveDmThreads(mappedThreads)
      }

      const mentions = threads
        .filter((t) => Number(t.unreadCount || 0) > 0)
        .slice(0, 3)
        .map((t) => `@you ${t.title || "Chat"} has ${t.unreadCount} unread`)

      if (mentions.length > 0) {
        setLiveMentionFeed(mentions)
      }
    } catch {
      // Keep static fallback UI if chat APIs are temporarily unavailable.
    }
  }, [])

  const loadForumTopics = useCallback(async () => {
    try {
      let mapped: ForumTopic[] = []

      if (selectedLeague?.id && selectedLeague?.tournamentId) {
        const leagueRes = await fetch(
          `/api/feed?scope=league&tournamentId=${encodeURIComponent(selectedLeague.tournamentId)}&leagueId=${encodeURIComponent(selectedLeague.id)}&limit=5`,
          { cache: "no-store" }
        )
        const leagueData = await leagueRes.json().catch(() => ({}))
        const leagueEvents: LeagueFeedEvent[] = Array.isArray(leagueData?.events) ? leagueData.events : []

        mapped = leagueEvents
          .filter((item) => typeof item?.title === "string" && item.title.trim().length > 0)
          .slice(0, 5)
          .map((item) => ({
            id: String(item.id),
            title: item.title.trim(),
            meta: (item.message || "").trim().slice(0, 32) || "League update",
            href: "/feed",
          }))
      }

      if (mapped.length === 0) {
        const res = await fetch("/api/content-feed?tab=trending&limit=6", { cache: "no-store" })
        const data = await res.json().catch(() => ({}))
        const items: FeedTopicItem[] = Array.isArray(data?.items) ? data.items : []
        mapped = items
          .filter((item) => typeof item?.title === "string" && item.title.trim().length > 0)
          .slice(0, 5)
          .map((item) => ({
            id: String(item.id),
            title: item.title.trim(),
            meta: (item.body || "").trim().slice(0, 32) || "Discuss in feed",
            href: typeof item.href === "string" && item.href.trim() ? item.href : "/feed",
          }))
      }

      if (mapped.length > 0) {
        setLiveForumTopics(mapped)
      }
    } catch {
      // Fallback to static forum list.
    }
  }, [selectedLeague?.id, selectedLeague?.tournamentId])

  const loadLeagueChat = useCallback(async (leagueId: string) => {
    setChatLoading(true)
    setChatError(null)
    try {
      const res = await fetch(`/api/app/leagues/${encodeURIComponent(leagueId)}/chat`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      const rows: any[] = Array.isArray(data?.messages) ? data.messages : []
      const mapped = rows
        .map(normalizeLeagueMessage)
        .filter((v: LeagueChatMessageVm | null): v is LeagueChatMessageVm => v != null)
      setChatMessages(mapped)
    } catch {
      setChatError("Unable to load league chat right now.")
      setChatMessages([])
    } finally {
      setChatLoading(false)
    }
  }, [])

  const sendLeagueMessage = useCallback(async () => {
    if (!selectedLeague?.id || sendingMessage) return
    const message = composer.trim()
    if (!message) return

    setSendingMessage(true)
    setChatError(null)
    try {
      const res = await fetch(`/api/app/leagues/${encodeURIComponent(selectedLeague.id)}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setChatError(typeof data?.error === "string" ? data.error : "Could not send message.")
        return
      }

      const created = normalizeLeagueMessage(data?.message)
      if (created) {
        setChatMessages((prev) => [...prev, created])
      }
      setComposer("")
    } catch {
      setChatError("Could not send message.")
    } finally {
      setSendingMessage(false)
    }
  }, [composer, selectedLeague?.id, sendingMessage])

  useEffect(() => {
    loadSidebarThreads()
  }, [loadSidebarThreads])

  useEffect(() => {
    loadForumTopics()
  }, [loadForumTopics])

  useEffect(() => {
    if (!selectedLeague?.id) {
      setChatMessages([])
      return
    }
    loadLeagueChat(selectedLeague.id)
  }, [selectedLeague?.id, loadLeagueChat])

  return (
    <main className="min-h-screen bg-[#0a1224] text-slate-100">
      <div className="mx-auto flex w-full max-w-[1700px] flex-col gap-4 p-3 md:p-4">
        <header className="rounded-2xl border border-slate-700/70 bg-[#121d35] px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.3)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-b from-cyan-500/25 to-blue-500/10 ring-1 ring-cyan-300/35">
                <Image src="/af-crest.png" alt="AF crest" width={26} height={26} className="h-6 w-6 object-contain" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-cyan-200/80">AllFantasy HQ</p>
                <h1 className="text-base font-semibold md:text-lg">Welcome back, {displayName}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setLeftCollapsed((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-600 bg-[#0f172d] px-3 py-2 text-xs font-medium text-slate-200 hover:border-cyan-300/50"
              >
                {leftCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                <span className="hidden sm:inline">Leagues</span>
              </button>
              <Link href="/settings" className="rounded-lg border border-slate-600 bg-[#0f172d] p-2 hover:border-cyan-300/50">
                <Settings className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <div className="flex min-h-[78vh] flex-col gap-4 lg:flex-row">
          <aside
            className={[
              "rounded-2xl border border-slate-700/70 bg-[#121d35] p-3 transition-all duration-300",
              leftCollapsed ? "lg:w-[92px]" : "lg:w-[320px]",
            ].join(" ")}
          >
            <div className="space-y-3">
              <div className="rounded-xl border border-slate-700 bg-[#0f172d] p-2">
                <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <MessageCircle className="h-3.5 w-3.5 text-cyan-300" />
                  {!leftCollapsed && "Direct Messages"}
                </div>
                <div className="space-y-1">
                  {liveDmThreads.map((dm) => (
                    <button
                      key={dm.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-800/70"
                    >
                      <div className="flex items-center gap-2">
                        <span className={dm.online ? "h-2 w-2 rounded-full bg-emerald-400" : "h-2 w-2 rounded-full bg-slate-500"} />
                        {!leftCollapsed && <span>{dm.name}</span>}
                      </div>
                      {!leftCollapsed && dm.badge > 0 && (
                        <span className="rounded-full bg-cyan-500/25 px-2 py-0.5 text-xs text-cyan-200">{dm.badge}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-[#0f172d] p-2">
                <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <Inbox className="h-3.5 w-3.5 text-amber-300" />
                  {!leftCollapsed && "Mentions / Inbox"}
                </div>
                <div className="space-y-1">
                  {liveMentionFeed.map((item) => (
                    <div key={item} className="rounded-lg px-2 py-2 text-xs text-slate-300 hover:bg-slate-800/70">
                      {!leftCollapsed ? item : "@"}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-[#0f172d] p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    <Trophy className="h-3.5 w-3.5 text-purple-300" />
                    {!leftCollapsed && "Leagues"}
                  </div>
                  {!leftCollapsed && (
                    <Link href="/leagues" className="text-[11px] text-cyan-300 hover:text-cyan-200">
                      View all
                    </Link>
                  )}
                </div>
                <div className="max-h-[34vh] space-y-1 overflow-auto pr-1">
                  {visibleLeagues.length === 0 && (
                    <div className="rounded-lg border border-slate-700/80 px-2 py-3 text-xs text-slate-400">
                      {!leftCollapsed ? "No leagues yet. Create one to get started." : "+"}
                    </div>
                  )}
                  {visibleLeagues.map((league) => {
                    const selected = league.id === selectedLeague?.id
                    return (
                      <button
                        key={league.id}
                        type="button"
                        onClick={() => setSelectedLeagueId(league.id)}
                        className={[
                          "w-full rounded-lg border px-2 py-2 text-left text-sm transition",
                          selected
                            ? "border-cyan-400/50 bg-cyan-500/10"
                            : "border-slate-700/70 bg-slate-900/35 hover:bg-slate-800/70",
                        ].join(" ")}
                      >
                        {leftCollapsed ? (
                          <div className="text-center text-xs font-semibold text-slate-200">{league.name.slice(0, 2).toUpperCase()}</div>
                        ) : (
                          <>
                            <div className="truncate font-medium">{league.name}</div>
                            <div className="text-xs text-slate-400">{league.memberCount} managers</div>
                          </>
                        )}
                      </button>
                    )
                  })}
                </div>
                {!leftCollapsed && lockedLeagues.length > 0 && (
                  <div className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-2 text-[11px] text-amber-200">
                    {lockedLeagues.length} league{lockedLeagues.length === 1 ? "" : "s"} hidden by tier policy. Join those by invite code.
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-700 bg-[#0f172d] p-2">
                <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <Hash className="h-3.5 w-3.5 text-pink-300" />
                  {!leftCollapsed && "Forums"}
                </div>
                <div className="space-y-1">
                  {liveForumTopics.map((forum) => (
                    <Link key={forum.id} href={forum.href} className="block w-full rounded-lg px-2 py-2 text-left text-xs text-slate-300 hover:bg-slate-800/70">
                      {leftCollapsed ? (
                        "#"
                      ) : (
                        <>
                          <div className="truncate">{forum.title}</div>
                          <div className="mt-0.5 truncate text-[11px] text-slate-500">{forum.meta}</div>
                        </>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          <section className="w-full rounded-2xl border border-slate-700/70 bg-[#121d35] p-3 md:p-4 lg:w-[380px]">
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-700 bg-[#0f172d] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Chosen League</p>
                    <h2 className="mt-1 text-lg font-semibold">{selectedLeague?.name || "No league selected"}</h2>
                    <p className="text-xs text-slate-400">{selectedLeague?.memberCount ?? 0} managers active</p>
                  </div>
                  <Link href="/leagues" className="rounded-md border border-slate-600 bg-slate-900/30 p-1.5 text-slate-200 hover:border-cyan-300/50">
                    <Search className="h-4 w-4" />
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/15 via-blue-500/10 to-transparent p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-cyan-100">
                  <Crown className="h-4 w-4" />
                  Ranking System
                </div>
                <div className="mt-2 text-3xl font-black text-white">{ranking.legacyPowerScore}</div>
                <p className="text-xs text-slate-300">Legacy Power Score from imported career history + current performance.</p>
                <p className="mt-1 text-[11px] text-cyan-100/90">
                  Access window: tier {Math.max(1, effectiveCareerTier - 1)} to tier {effectiveCareerTier + 1}. Outside tiers require invite code.
                </p>

                <div className="mt-3 rounded-lg border border-slate-700/70 bg-[#0f172d]/80 p-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300">Tier</span>
                    <span className="font-semibold text-cyan-200">{ranking.tier.name}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                    <span>Level {ranking.level}</span>
                    <span>{ranking.xp.toLocaleString()} XP</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${ranking.progressPct}%` }} />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <Link href="/af-legacy?tab=rankings" className="rounded-md border border-cyan-300/40 bg-cyan-500/15 px-2.5 py-1 text-xs font-medium text-cyan-100 hover:bg-cyan-500/25">
                    Open Legacy Rankings
                  </Link>
                  <Link href="/af-legacy?tab=overview" className="rounded-md border border-slate-600 bg-slate-900/40 px-2.5 py-1 text-xs font-medium text-slate-200 hover:border-slate-500">
                    View Legacy Profile
                  </Link>
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-[#0f172d] p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  Legacy Tools (in your homepage)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {quickLegacyTools.map((tool) => (
                    <Link
                      key={tool.name}
                      href={tool.href}
                      className="rounded-lg border border-slate-700 bg-slate-900/40 px-2 py-2 text-xs text-slate-200 hover:border-cyan-400/40"
                    >
                      {tool.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-slate-700 bg-[#0f172d] p-3">
                <h3 className="mb-2 text-sm font-semibold">Ranking FAQ</h3>
                <div className="space-y-2 text-xs">
                  <details className="rounded-lg border border-slate-700 bg-slate-900/40 p-2" open>
                    <summary className="cursor-pointer font-medium">How is my rank calculated?</summary>
                    <p className="mt-1 text-slate-300">Your score combines imported legacy history, active league participation, and entry outcomes. Higher consistency and stronger results raise your tier over time.</p>
                  </details>
                  <details className="rounded-lg border border-slate-700 bg-slate-900/40 p-2">
                    <summary className="cursor-pointer font-medium">How do I level up faster?</summary>
                    <p className="mt-1 text-slate-300">Play consistently, finish strong in multiple leagues, and use the legacy tools to improve trade, waiver, and lineup decisions each week.</p>
                  </details>
                  <details className="rounded-lg border border-slate-700 bg-slate-900/40 p-2">
                    <summary className="cursor-pointer font-medium">Where can I verify this data?</summary>
                    <p className="mt-1 text-slate-300">Open Legacy Rankings and Legacy Profile above to review the same imported history driving this score.</p>
                  </details>
                </div>
              </div>
            </div>
          </section>

          <section className="flex min-h-[62vh] flex-1 flex-col rounded-2xl border border-slate-700/70 bg-[#121d35] p-3 md:p-4">
            <div className="mb-3 flex items-center justify-between rounded-xl border border-slate-700 bg-[#0f172d] p-3">
              <div>
                <h2 className="text-lg font-semibold">League Chat</h2>
                <p className="text-xs text-slate-400">{selectedLeague?.name || "League"} live feed</p>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-200">
                <Flame className="h-3 w-3" />
                Active
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-auto rounded-xl border border-slate-700 bg-[#0f172d] p-3">
              {chatLoading && <p className="text-xs text-slate-400">Loading chat...</p>}
              {chatError && <p className="text-xs text-amber-300">{chatError}</p>}
              {!chatLoading && chatMessages.length === 0 && !chatError && (
                <p className="text-xs text-slate-400">No messages yet. Start the conversation.</p>
              )}
              {chatMessages.map((msg) => (
                <article key={msg.id} className="rounded-xl border border-slate-700/80 bg-slate-900/40 p-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">{msg.author}</p>
                    <p className="text-[11px] text-slate-500">{msg.meta}</p>
                  </div>
                  <p className="text-sm text-slate-200">{msg.text}</p>
                </article>
              ))}
            </div>

            <div className="mt-3 rounded-xl border border-slate-700 bg-[#0f172d] p-2">
              <div className="flex items-center gap-2">
                <Link href="/messages" className="rounded-lg border border-slate-600 bg-slate-900/50 p-2 text-slate-300 hover:border-cyan-300/50">
                  <Plus className="h-4 w-4" />
                </Link>
                <input
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      void sendLeagueMessage()
                    }
                  }}
                  placeholder="Type a message..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/40 px-3 py-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => void sendLeagueMessage()}
                  disabled={sendingMessage || !composer.trim()}
                  className="rounded-lg bg-cyan-500 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}

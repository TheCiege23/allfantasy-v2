"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  ArrowRight,
  Bot,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CloudSun,
  Copy,
  Download,
  Goal,
  Inbox,
  LayoutGrid,
  MessageSquare,
  Newspaper,
  PlusCircle,
  ShieldCheck,
  Wand2,
  RefreshCw,
} from "lucide-react"
import LanguageToggle from "@/components/i18n/LanguageToggle"
import { EmptyStateRenderer, ErrorStateRenderer, LoadingStateRenderer } from "@/components/ui-states"
import {
  getSportSectionLabel,
  getUnifiedDashboardPayload,
  groupLeaguesBySport,
  type LeagueForGrouping,
  type UnifiedDashboardPayload,
} from "@/lib/dashboard"
import { useLeagueList } from "@/hooks/useLeagueList"
import { getLeagueVariantLabel } from "@/lib/league-creation/LeagueVariantResolver"
import { useUserTimezone } from "@/hooks/useUserTimezone"
import {
  normalizeToSupportedSport,
  SUPPORTED_SPORTS,
  type SupportedSport,
} from "@/lib/sport-scope"
import { resolveFallbackRoute, resolveNoResultsState, resolveRecoveryActions } from "@/lib/ui-state"
import { AIProductLayer } from "@/lib/ai-product-layer"
import { OnboardingChecklist, OnboardingProgressWidget } from "@/components/onboarding-retention"
import type { OnboardingChecklistState, RetentionNudge } from "@/lib/onboarding-retention"
import { useAIAssistantAvailability } from "@/hooks/useAIAssistantAvailability"

interface DashboardProps {
  onboardingComplete?: boolean
  checklistState?: OnboardingChecklistState | null
  retentionNudges?: RetentionNudge[]
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
    joinCode?: string | null
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
  initialDashboardPayload?: UnifiedDashboardPayload
}

type DashboardTab = "Home" | "My Leagues" | "Sports" | "Matchups" | "Team" | "Tools" | "AI" | "Messages" | "Activity"

type DashboardLeague = LeagueForGrouping & {
  season?: number | null
  status?: string | null
  createdAt?: string | null
}

type LeagueStandingsRow = {
  entryId: string
  entryName: string
  displayName?: string | null
  totalPoints: number
  correctPicks?: number
  totalPicks?: number
}

type LeagueChatMessage = {
  id: string
  message: string
  createdAt: string
  userName: string
}

type ActivityItem = {
  id: string
  title: string
  summary: string
  href: string | null
  label: string
  publishedAt: string | null
}

type SportsNewsItem = {
  id: string
  title: string
  source: string
  publishedAt: string | null
  href: string | null
  sport: SupportedSport | null
}

type SportsWeatherCard = {
  team: string
  venue: string
  isDome: boolean
  summary: string
  temperature: string
  wind: string
  source: string
}

const DASHBOARD_TABS: DashboardTab[] = ["Home", "My Leagues", "Sports", "Matchups", "Team", "Tools", "AI", "Messages", "Activity"]
const ALL_SPORTS_FILTER = "ALL" as const
type SportFilter = typeof ALL_SPORTS_FILTER | SupportedSport

function rosterItemLabel(item: unknown): string {
  if (typeof item === "string") return item
  if (item && typeof item === "object") {
    const row = item as Record<string, unknown>
    const name = row.name || row.fullName || row.playerName || row.displayName || row.id
    if (typeof name === "string") return name
  }
  return "Roster asset"
}

function formatDateLabel(
  input: string | null | undefined,
  formatter: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string
): string {
  if (!input) return "No timestamp"
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return "No timestamp"
  return formatter(input)
}

function formatVariantLabel(league: { leagueVariant?: string | null; league_variant?: string | null }): string {
  return getLeagueVariantLabel(league.leagueVariant ?? league.league_variant ?? null)
}

function getInitials(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "AF"
}

function resolveNewsSportFromRecord(input: Record<string, unknown>): SupportedSport | null {
  const directCandidate = [
    input.sport,
    input.sportType,
    input.sport_type,
    input.league,
    input.category,
    input.feedSport,
  ].find((value) => typeof value === "string")

  const directSport = normalizeToSupportedSport(
    typeof directCandidate === "string" ? directCandidate : null
  )

  if (directSport) return directSport

  const haystack = [input.title, input.headline, input.source]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase()

  if (haystack.includes("soccer")) return "SOCCER"
  if (haystack.includes("ncaab") || haystack.includes("ncaa basketball")) return "NCAAB"
  if (
    haystack.includes("ncaaf") ||
    haystack.includes("ncaa football") ||
    haystack.includes("college football")
  ) {
    return "NCAAF"
  }
  if (haystack.includes("nhl") || haystack.includes("hockey")) return "NHL"
  if (haystack.includes("mlb") || haystack.includes("baseball")) return "MLB"
  if (haystack.includes("nba") || haystack.includes("basketball")) return "NBA"
  if (haystack.includes("nfl") || haystack.includes("football")) return "NFL"

  return null
}

function getSportAccentClasses(sport: SupportedSport | null): string {
  switch (sport) {
    case "NFL":
      return "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
    case "NBA":
      return "border-orange-400/30 bg-orange-400/10 text-orange-100"
    case "NHL":
      return "border-blue-400/30 bg-blue-400/10 text-blue-100"
    case "MLB":
      return "border-rose-400/30 bg-rose-400/10 text-rose-100"
    case "NCAAF":
      return "border-emerald-400/30 bg-emerald-400/10 text-emerald-100"
    case "NCAAB":
      return "border-violet-400/30 bg-violet-400/10 text-violet-100"
    case "SOCCER":
      return "border-green-400/30 bg-green-400/10 text-green-100"
    default:
      return "border-white/15 bg-white/[0.04] text-slate-200"
  }
}

function getSportEmoji(sport: SupportedSport | null): string {
  switch (sport) {
    case "NFL":
      return "🏈"
    case "NBA":
      return "🏀"
    case "NHL":
      return "🏒"
    case "MLB":
      return "⚾"
    case "NCAAF":
      return "🎓"
    case "NCAAB":
      return "🏆"
    case "SOCCER":
      return "⚽"
    default:
      return "🏟️"
  }
}

function getLeagueStatusMeta(rawStatus: string | null | undefined): {
  label: string
  className: string
} {
  const value = String(rawStatus || "").toLowerCase()

  if (value.includes("draft")) {
    return {
      label: "Drafting",
      className: "border-cyan-400/25 bg-cyan-400/10 text-cyan-100",
    }
  }
  if (
    value.includes("active") ||
    value.includes("live") ||
    value.includes("synced") ||
    value.includes("ready")
  ) {
    return {
      label: "Active",
      className: "border-emerald-400/25 bg-emerald-400/10 text-emerald-100",
    }
  }
  if (value.includes("pre") || value.includes("queue") || value.includes("upcoming")) {
    return {
      label: "Pre-Draft",
      className: "border-amber-400/25 bg-amber-400/10 text-amber-100",
    }
  }

  return {
    label: "Connected",
    className: "border-violet-400/25 bg-violet-400/10 text-violet-100",
  }
}

export default function DashboardContent({
  onboardingComplete = false,
  checklistState = null,
  retentionNudges = [],
  user,
  profile,
  leagues,
  entries,
  userCareerTier,
  isAdmin = false,
  initialDashboardPayload,
}: DashboardProps) {
  const router = useRouter()
  const { enabled: aiAssistantEnabled, loading: aiAvailabilityLoading } = useAIAssistantAvailability()
  const displayName = user.displayName || user.username || user.email.split("@")[0] || "Manager"
  const { formatInTimezone } = useUserTimezone()
  const careerTier = Number.isFinite(Number(userCareerTier)) ? Math.max(1, Math.floor(Number(userCareerTier))) : 1
  const visibleLeagues = useMemo(() => leagues.filter((league) => league.inTierRange !== false), [leagues])
  const { leagues: connectedLeagueList, loading: connectedLeaguesLoading, error: connectedLeaguesError, refetch: refetchConnectedLeagues } = useLeagueList(true)
  const connectedLeagues = useMemo(() => connectedLeagueList as DashboardLeague[], [connectedLeagueList])

  const [activeTab, setActiveTab] = useState<DashboardTab>("Home")
  const [chatPane, setChatPane] = useState<"chimmy" | "messages">("chimmy")
  const [sportFilter, setSportFilter] = useState<SportFilter>(ALL_SPORTS_FILTER)
  const [feedSportFilter, setFeedSportFilter] = useState<SportFilter>(ALL_SPORTS_FILTER)
  const [collapsedSports, setCollapsedSports] = useState<Record<string, boolean>>({})
  const [refreshingDashboard, setRefreshingDashboard] = useState(false)
  const [dashboardRefreshTick, setDashboardRefreshTick] = useState(0)
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(visibleLeagues[0]?.id ?? null)
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle")
  const [chatMessages, setChatMessages] = useState<LeagueChatMessage[]>([])
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState("")
  const [postingMessage, setPostingMessage] = useState(false)
  const [standings, setStandings] = useState<LeagueStandingsRow[]>([])
  const [standingsLoading, setStandingsLoading] = useState(false)
  const [rosterAssets, setRosterAssets] = useState<string[]>([])
  const [rosterMeta, setRosterMeta] = useState<{ faabRemaining: number | null; waiverPriority: number | null }>({
    faabRemaining: null,
    waiverPriority: null,
  })
  const [rosterLoading, setRosterLoading] = useState(false)
  const [activityItems, setActivityItems] = useState<ActivityItem[]>([])
  const [activityLoading, setActivityLoading] = useState(false)
  const [sportsNews, setSportsNews] = useState<SportsNewsItem[]>([])
  const [sportsNewsLoading, setSportsNewsLoading] = useState(false)
  const [sportsWeather, setSportsWeather] = useState<SportsWeatherCard | null>(null)
  const [sportsWeatherLoading, setSportsWeatherLoading] = useState(false)

  const filteredConnectedLeagues = useMemo(() => {
    if (sportFilter === ALL_SPORTS_FILTER) return connectedLeagues
    return connectedLeagues.filter((league) => {
      const sport = typeof league.sport === "string" ? league.sport : typeof league.sport_type === "string" ? league.sport_type : undefined
      return normalizeToSupportedSport(sport) === sportFilter
    })
  }, [connectedLeagues, sportFilter])

  const groupedConnectedLeagues = useMemo(
    () => groupLeaguesBySport(filteredConnectedLeagues),
    [filteredConnectedLeagues]
  )

  const dashboardPayload = useMemo(
    () =>
      getUnifiedDashboardPayload(
        {
          appLeagues: connectedLeagues,
          bracketLeagues: visibleLeagues.map((league) => ({
            id: league.id,
            name: league.name,
            tournamentId: league.tournamentId,
            memberCount: league.memberCount,
          })),
          bracketEntries: entries.map((entry) => ({
            id: entry.id,
            name: entry.name,
            tournamentId: entry.tournamentId,
            score: entry.score,
          })),
        },
        {
          isVerified: profile.isVerified,
          isAgeConfirmed: profile.isAgeConfirmed,
          profileComplete: profile.profileComplete,
        },
        {
          isAdmin,
        }
      ),
    [
      connectedLeagues,
      entries,
      isAdmin,
      profile.isAgeConfirmed,
      profile.isVerified,
      profile.profileComplete,
      visibleLeagues,
    ]
  )

  const resolvedDashboardPayload =
    connectedLeagues.length === 0 && initialDashboardPayload
      ? initialDashboardPayload
      : dashboardPayload
  useEffect(() => {
    if (!visibleLeagues.length) {
      setSelectedLeagueId(null)
      return
    }
    if (!selectedLeagueId || !visibleLeagues.some((league) => league.id === selectedLeagueId)) {
      setSelectedLeagueId(visibleLeagues[0].id)
    }
  }, [selectedLeagueId, visibleLeagues])

  useEffect(() => {
    setCollapsedSports((prev) => {
      const next: Record<string, boolean> = {}
      for (const group of groupedConnectedLeagues) {
        next[group.sport] = prev[group.sport] ?? false
      }
      return next
    })
  }, [groupedConnectedLeagues])

  const selectedLeague = useMemo(
    () => visibleLeagues.find((league) => league.id === selectedLeagueId) || visibleLeagues[0] || null,
    [selectedLeagueId, visibleLeagues]
  )

  const selectedConnectedLeague = useMemo(
    () => {
      if (selectedLeague?.id) {
        return connectedLeagues.find((league) => league.id === selectedLeague.id) || null
      }
      return connectedLeagues[0] || null
    },
    [connectedLeagues, selectedLeague?.id]
  )

  const selectedLeagueContext = useMemo(
    () =>
      selectedLeague
        ? {
            id: selectedLeague.id,
            sport: selectedConnectedLeague?.sport ?? null,
            leagueVariant: selectedConnectedLeague?.leagueVariant ?? selectedConnectedLeague?.league_variant ?? null,
          }
        : selectedConnectedLeague
          ? {
              id: selectedConnectedLeague.id,
              sport: selectedConnectedLeague.sport ?? null,
              leagueVariant: selectedConnectedLeague.leagueVariant ?? selectedConnectedLeague.league_variant ?? null,
            }
          : null,
    [
      selectedConnectedLeague?.id,
      selectedConnectedLeague?.leagueVariant,
      selectedConnectedLeague?.league_variant,
      selectedConnectedLeague?.sport,
      selectedLeague,
    ]
  )

  const connectedPlatforms = useMemo(
    () => Array.from(new Set(connectedLeagues.map((league) => String(league.platform || "custom").toUpperCase()))),
    [connectedLeagues]
  )

  const selectedTournamentEntries = useMemo(() => {
    if (!selectedLeague?.tournamentId) return entries
    const scoped = entries.filter((entry) => entry.tournamentId === selectedLeague.tournamentId)
    return scoped.length ? scoped : entries
  }, [entries, selectedLeague?.tournamentId])

  const heroLabel = profile.sleeperUsername ? `Connected as @${profile.sleeperUsername}` : "Connect Sleeper to unlock league-aware tools"
  const inviteCode = selectedLeague?.joinCode || (selectedLeague?.id ? selectedLeague.id.slice(0, 11) : null)
  const inviteLink = inviteCode ? `https://allfantasy.ai/j/${inviteCode}` : null
  const buildLeagueContextHref = useCallback(
    (basePath: string): string => {
      if (!selectedLeagueContext) return basePath
      const params = new URLSearchParams()
      params.set("leagueId", selectedLeagueContext.id)
      if (selectedLeagueContext.sport) {
        params.set("sport", String(selectedLeagueContext.sport).toUpperCase())
      }
      if (selectedLeagueContext.leagueVariant) {
        params.set("leagueVariant", String(selectedLeagueContext.leagueVariant))
      }
      const query = params.toString()
      if (!query) return basePath
      return `${basePath}${basePath.includes("?") ? "&" : "?"}${query}`
    },
    [selectedLeagueContext]
  )
  const leagueSummaryHref = selectedLeagueContext ? `/app/league/${selectedLeagueContext.id}` : "/leagues"
  const matchupsHref = selectedLeagueContext ? `/app/league/${selectedLeagueContext.id}?tab=Matchups` : "/matchup-simulator"
  const teamHref = selectedLeagueContext ? `/app/league/${selectedLeagueContext.id}?tab=Roster` : "/player-comparison"
  const resolvedLeagueSport = selectedLeagueContext?.sport
    ? AIProductLayer.resolveSupportedSport(String(selectedLeagueContext.sport))
    : undefined
  const aiProductContext = {
    leagueId: selectedLeagueContext?.id,
    sport: resolvedLeagueSport,
    source: "dashboard",
  } as const
  const draftHref = selectedLeagueContext ? `/app/league/${selectedLeagueContext.id}/draft` : "/mock-draft"
  const intelligenceHref = selectedLeagueContext
    ? `/app/league/${selectedLeagueContext.id}?tab=Intelligence`
    : AIProductLayer.chimmy.getChatHref(aiProductContext)
  const chimmyHref = AIProductLayer.chimmy.getChatHref(aiProductContext)
  const tradeAnalyzerHref = AIProductLayer.routes.getHrefForFeature("trade_analyzer", aiProductContext)
  const tradeFinderHref = buildLeagueContextHref("/trade-finder")
  const waiverAiHref = AIProductLayer.routes.getHrefForFeature("waiver_ai", aiProductContext)
  const tradeEvaluatorHref = AIProductLayer.routes.getHrefForFeature("trade_evaluator", aiProductContext)
  const coachHref = buildLeagueContextHref("/app/coach")
  const safeChimmyHref = aiAssistantEnabled ? chimmyHref : coachHref

  const compactChecklist = useMemo(
    () => [
      { label: "Profile", complete: profile.profileComplete },
      { label: "Verified", complete: profile.isVerified },
      { label: "Age", complete: profile.isAgeConfirmed },
      { label: "League Link", complete: !!profile.sleeperUsername },
    ],
    [profile.isAgeConfirmed, profile.isVerified, profile.profileComplete, profile.sleeperUsername]
  )

  const toolCards = useMemo(
    () => [
      { title: "Rankings", description: "League-aware rankings and player values.", href: "/rankings", accent: "from-cyan-500/20 to-blue-500/10" },
      { title: "Trade Analyzer", description: "Context-aware trade evaluation and counters.", href: tradeAnalyzerHref, accent: "from-emerald-500/20 to-cyan-500/10" },
      { title: "Trade Finder", description: "Find partners and package ideas.", href: tradeFinderHref, accent: "from-fuchsia-500/20 to-violet-500/10" },
      { title: "Waiver AI", description: "Pickup advice and FAAB guidance.", href: waiverAiHref, accent: "from-amber-500/20 to-orange-500/10" },
      { title: "League Pulse", description: "Open your current league intelligence view.", href: intelligenceHref, accent: "from-sky-500/20 to-cyan-500/10" },
      { title: "Mock Draft", description: "Practice drafts without leaving the workflow.", href: "/mock-draft", accent: "from-indigo-500/25 to-violet-500/10" },
      { title: "Draft Room", description: "Jump into your active league draft flow.", href: draftHref, accent: "from-violet-500/20 to-cyan-500/10" },
      { title: "Brackets", description: "Bracket leagues, picks, and standings.", href: "/brackets", accent: "from-pink-500/20 to-rose-500/10" },
      { title: "Player Comparison", description: "Head-to-head player analysis.", href: "/player-comparison", accent: "from-slate-500/20 to-cyan-500/10" },
      { title: "Matchup Simulator", description: "Run matchup scenarios and game swings.", href: "/matchup-simulator", accent: "from-cyan-500/20 to-indigo-500/10" },
    ],
    [draftHref, intelligenceHref, tradeAnalyzerHref, tradeFinderHref, waiverAiHref]
  )

  const aiShortcuts = useMemo(
    () => [
      {
        title: aiAssistantEnabled ? "Ask Chimmy" : "AI temporarily unavailable",
        href: safeChimmyHref,
        subtitle: aiAssistantEnabled
          ? "Private AI chat with league context"
          : aiAvailabilityLoading
            ? "Checking AI availability..."
            : "Open deterministic lineup guidance",
      },
      { title: "Trade Advice", href: tradeEvaluatorHref, subtitle: "Instant deal analysis and negotiation help" },
      { title: "Waiver Advice", href: waiverAiHref, subtitle: "Free-agent priorities and FAAB plan" },
      { title: "Lineup Help", href: coachHref, subtitle: "Start or sit and roster construction guidance" },
      { title: "League Recap", href: intelligenceHref, subtitle: "League-aware pulse, recap, and next moves" },
    ],
    [aiAssistantEnabled, aiAvailabilityLoading, coachHref, intelligenceHref, safeChimmyHref, tradeEvaluatorHref, waiverAiHref]
  )

  const tierHeadline = useMemo(() => {
    if (careerTier <= 2) return "Elite"
    if (careerTier <= 4) return "Pro"
    if (careerTier <= 7) return "Contender"
    return "Rookie"
  }, [careerTier])

  const updateItems = useMemo(() => {
    if (activityItems.length) {
      return activityItems.slice(0, 3).map((item) => ({
        id: item.id,
        label: item.label,
        title: item.title,
        href: item.href,
      }))
    }

    return resolvedDashboardPayload.setupAlerts.slice(0, 3).map((alert) => ({
      id: alert.id,
      label: "setup",
      title: alert.title,
      href: alert.actionHref ?? null,
    }))
  }, [activityItems, resolvedDashboardPayload.setupAlerts])

  const filteredFeedItems = useMemo(() => {
    if (feedSportFilter === ALL_SPORTS_FILTER) return sportsNews
    return sportsNews.filter((item) => item.sport === feedSportFilter)
  }, [feedSportFilter, sportsNews])

  const sportsFeedItems = filteredFeedItems.length ? filteredFeedItems : sportsNews
  const rightRailLeagues = useMemo(() => visibleLeagues.slice(0, 8), [visibleLeagues])
  const chatPreviewMessages = useMemo(() => chatMessages.slice(-6), [chatMessages])
  const selectedSport = normalizeToSupportedSport(
    typeof selectedConnectedLeague?.sport === "string" ? selectedConnectedLeague.sport : null
  )
  const selectedLeagueName =
    selectedLeague?.name || selectedConnectedLeague?.name || "No league selected"
  const selectedSportLabel = selectedSport ? getSportSectionLabel(selectedSport) : "League context"

  const normalizeChatMessage = useCallback((msg: any): LeagueChatMessage => {
    const fallbackName = msg?.user?.displayName || msg?.user?.email?.split("@")[0] || "Manager"
    return {
      id: String(msg?.id || `${fallbackName}-${msg?.createdAt || Date.now()}`),
      message: String(msg?.message || ""),
      createdAt: String(msg?.createdAt || new Date().toISOString()),
      userName: String(fallbackName),
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadStandings() {
      if (!selectedLeague?.id) {
        setStandings([])
        return
      }
      setStandingsLoading(true)
      try {
        const response = await fetch(`/api/bracket/leagues/${selectedLeague.id}/standings`, { cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || "Failed to load standings")
        if (!cancelled) {
          setStandings(Array.isArray(data?.standings) ? data.standings.slice(0, 6) : [])
        }
      } catch {
        if (!cancelled) setStandings([])
      } finally {
        if (!cancelled) setStandingsLoading(false)
      }
    }
    void loadStandings()
    return () => {
      cancelled = true
    }
  }, [dashboardRefreshTick, selectedLeague?.id])

  useEffect(() => {
    let cancelled = false
    async function loadRosterPreview() {
      if (!selectedLeague?.id) {
        setRosterAssets([])
        setRosterMeta({ faabRemaining: null, waiverPriority: null })
        return
      }
      setRosterLoading(true)
      try {
        const response = await fetch(`/api/league/roster?leagueId=${encodeURIComponent(selectedLeague.id)}`, { cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || "Failed to load roster")
        const rawRoster = Array.isArray(data?.roster) ? data.roster : []
        if (!cancelled) {
          setRosterAssets(rawRoster.map(rosterItemLabel).slice(0, 12))
          setRosterMeta({
            faabRemaining: typeof data?.faabRemaining === "number" ? data.faabRemaining : null,
            waiverPriority: typeof data?.waiverPriority === "number" ? data.waiverPriority : null,
          })
        }
      } catch {
        if (!cancelled) {
          setRosterAssets([])
          setRosterMeta({ faabRemaining: null, waiverPriority: null })
        }
      } finally {
        if (!cancelled) setRosterLoading(false)
      }
    }
    void loadRosterPreview()
    return () => {
      cancelled = true
    }
  }, [dashboardRefreshTick, selectedLeague?.id])

  useEffect(() => {
    let cancelled = false
    async function loadLeagueChat() {
      if (!selectedLeague?.id) {
        setChatMessages([])
        setChatError(null)
        return
      }
      setChatLoading(true)
      setChatError(null)
      try {
        const response = await fetch(`/api/bracket/leagues/${selectedLeague.id}/chat`, { cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        if (!response.ok) throw new Error(data?.error || "League chat is unavailable for this league")
        const list = Array.isArray(data?.messages) ? data.messages.map(normalizeChatMessage) : []
        if (!cancelled) setChatMessages(list)
      } catch (error) {
        if (!cancelled) {
          setChatMessages([])
          setChatError(error instanceof Error ? error.message : "Failed to load chat")
        }
      } finally {
        if (!cancelled) setChatLoading(false)
      }
    }
    void loadLeagueChat()
    return () => {
      cancelled = true
    }
  }, [dashboardRefreshTick, normalizeChatMessage, selectedLeague?.id])

  useEffect(() => {
    let cancelled = false
    async function loadActivity() {
      setActivityLoading(true)
      try {
        const response = await fetch("/api/content-feed?tab=for_you&limit=8", { cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        const items = Array.isArray(data?.items) ? data.items : []
        if (!cancelled) {
          setActivityItems(
            items.slice(0, 8).map((item: any, index: number) => ({
              id: String(item?.id || item?.slug || index),
              title: String(item?.title || item?.headline || item?.label || item?.type || "Activity"),
              summary: String(item?.summary || item?.description || item?.body || "Open the feed for details."),
              href: typeof item?.href === "string" ? item.href : typeof item?.path === "string" ? item.path : null,
              label: String(item?.type || "feed"),
              publishedAt: typeof item?.publishedAt === "string" ? item.publishedAt : typeof item?.createdAt === "string" ? item.createdAt : null,
            }))
          )
        }
      } catch {
        if (!cancelled) setActivityItems([])
      } finally {
        if (!cancelled) setActivityLoading(false)
      }
    }
    void loadActivity()
    return () => {
      cancelled = true
    }
  }, [dashboardRefreshTick])

  useEffect(() => {
    let cancelled = false
    async function loadSportsNews() {
      setSportsNewsLoading(true)
      try {
        const response = await fetch("/api/sports/news?limit=6", { cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        const news = Array.isArray(data?.news) ? data.news : []
        if (!cancelled) {
          setSportsNews(
            news.slice(0, 6).map((item: any, index: number) => ({
              id: String(item?.id || item?.newsId || index),
              title: String(item?.title || item?.headline || "Sports update"),
              source: String(item?.source || "news"),
              publishedAt: typeof item?.publishedAt === "string" ? item.publishedAt : null,
              href: typeof item?.url === "string" ? item.url : typeof item?.link === "string" ? item.link : null,
              sport: resolveNewsSportFromRecord(item ?? {}),
            }))
          )
        }
      } catch {
        if (!cancelled) setSportsNews([])
      } finally {
        if (!cancelled) setSportsNewsLoading(false)
      }
    }
    void loadSportsNews()
    return () => {
      cancelled = true
    }
  }, [dashboardRefreshTick])

  useEffect(() => {
    let cancelled = false
    async function loadSportsWeather() {
      setSportsWeatherLoading(true)
      try {
        const response = await fetch("/api/sports/weather?team=KC", { cache: "no-store" })
        const data = await response.json().catch(() => ({}))
        const weather = data?.weather || {}
        const condition = weather?.condition || weather?.description || weather?.summary || "Weather available"
        const temperature = weather?.tempF || weather?.temperatureF || weather?.temp || weather?.temperature
        const wind = weather?.windMph || weather?.windSpeed || weather?.wind
        if (!cancelled) {
          setSportsWeather({
            team: String(data?.team || "KC"),
            venue: String(data?.venue || "Stadium"),
            isDome: Boolean(data?.isDome),
            summary: String(condition),
            temperature: temperature != null ? String(temperature) : "--",
            wind: wind != null ? String(wind) : "--",
            source: String(data?.source || "openweathermap"),
          })
        }
      } catch {
        if (!cancelled) setSportsWeather(null)
      } finally {
        if (!cancelled) setSportsWeatherLoading(false)
      }
    }
    void loadSportsWeather()
    return () => {
      cancelled = true
    }
  }, [dashboardRefreshTick])

  const handleCopyInvite = useCallback(async () => {
    if (!inviteLink) return
    try {
      await navigator.clipboard.writeText(inviteLink)
      setCopyStatus("copied")
      window.setTimeout(() => setCopyStatus("idle"), 1400)
    } catch {
      setCopyStatus("failed")
      window.setTimeout(() => setCopyStatus("idle"), 1400)
    }
  }, [inviteLink])

  const handleRefreshDashboard = useCallback(async () => {
    setRefreshingDashboard(true)
    try {
      await refetchConnectedLeagues()
      setDashboardRefreshTick((tick) => tick + 1)
    } finally {
      setRefreshingDashboard(false)
    }
  }, [refetchConnectedLeagues])

  const handleRetryConnectedLeagues = useCallback(async () => {
    await refetchConnectedLeagues()
    setDashboardRefreshTick((tick) => tick + 1)
  }, [refetchConnectedLeagues])

  const toggleSportSection = useCallback((sport: string) => {
    setCollapsedSports((prev) => ({ ...prev, [sport]: !prev[sport] }))
  }, [])

  const handleSendMessage = useCallback(async () => {
    if (!selectedLeague?.id || !newMessage.trim()) return
    setPostingMessage(true)
    setChatError(null)
    try {
      const response = await fetch(`/api/bracket/leagues/${selectedLeague.id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage.trim(), type: "text" }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.error || "Failed to send message")
      const created = data?.message ? normalizeChatMessage(data.message) : null
      if (created) setChatMessages((prev) => [...prev, created])
      setNewMessage("")
    } catch (error) {
      setChatError(error instanceof Error ? error.message : "Failed to send message")
    } finally {
      setPostingMessage(false)
    }
  }, [newMessage, normalizeChatMessage, selectedLeague?.id])

  const emptyState =
    !visibleLeagues.length &&
    !connectedLeaguesLoading &&
    connectedLeagues.length === 0 &&
    !connectedLeaguesError

  const renderHomeTab = () => (
    <div className="space-y-4">
      {!onboardingComplete ? (
        <section
          data-testid="dashboard-onboarding-retention-panel"
          className="rounded-[24px] border border-white/10 bg-[#16102a] p-4 space-y-3"
        >
          <OnboardingProgressWidget initialState={checklistState} />
          <OnboardingChecklist initialState={checklistState} />
        </section>
      ) : null}
      <section className="rounded-[24px] border border-white/10 bg-[#16102a] px-5 py-4 text-center">
        <h2 className="text-2xl font-black text-white">
          Welcome back, <span className="text-cyan-300">{displayName}</span>
        </h2>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link href="/create-league" className="inline-flex min-h-[42px] items-center rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-cyan-300">
            + Create League
          </Link>
          <Link href="/import" className="inline-flex min-h-[42px] items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.08]">
            📥 Import
          </Link>
          <Link href="/find-league" className="inline-flex min-h-[42px] items-center rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white hover:bg-white/[0.08]">
            🔍 Find League
          </Link>
        </div>
      </section>

      <Link
        href="/dashboard/rankings"
        className="flex items-center gap-4 rounded-[24px] border border-white/10 bg-[#16102a] px-5 py-4 hover:bg-[#1c1535]"
      >
        <div className="text-5xl font-black leading-none text-cyan-300">{careerTier}</div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-bold text-white">Tier {careerTier} - {tierHeadline}</p>
          <p className="mt-1 text-sm text-slate-300">
            {entries.length} tracked entries · {visibleLeagues.length} active leagues
          </p>
          <div className="mt-3 h-1.5 rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#06b6d4,#3b82f6)]"
              style={{
                width: `${Math.max(
                  12,
                  Math.round(
                    (compactChecklist.filter((item) => item.complete).length / compactChecklist.length) * 100
                  )
                )}%`,
              }}
            />
          </div>
          <p className="mt-2 text-xs font-semibold text-cyan-200">How rankings work →</p>
        </div>
      </Link>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            href: "/create-league",
            label: "Create League",
            subtitle: "Start from scratch",
            icon: "➕",
          },
          {
            href: "/import",
            label: "Import League",
            subtitle: "Sleeper, Yahoo, ESPN & more",
            icon: "📥",
          },
          {
            href: "/find-league",
            label: "Find a League",
            subtitle: "Browse open leagues",
            icon: "🔍",
          },
          {
            href: "/dashboard/rankings",
            label: "My Rankings",
            subtitle: `Tier ${careerTier} · Level up`,
            icon: "🏆",
          },
          {
            href: "/tools-hub",
            label: "AI Tools",
            subtitle: "Trade AI, Waiver, Draft & more",
            icon: "🤖",
          },
        ].map((action) => (
          <Link
            key={action.label}
            href={action.href}
            className="rounded-[20px] border border-white/10 bg-[#16102a] p-4 text-center hover:bg-[#1c1535]"
          >
            <div className="text-2xl">{action.icon}</div>
            <p className="mt-3 text-sm font-bold text-white">{action.label}</p>
            <p className="mt-1 text-xs text-slate-300">{action.subtitle}</p>
          </Link>
        ))}
      </div>

      <section className="rounded-[24px] border border-white/10 bg-[#16102a] p-5">
        <div className="mb-4 flex items-center gap-2">
          <h3 className="text-xl font-black text-white">My Leagues</h3>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-semibold text-slate-300">
            {connectedLeagues.length} active
          </span>
        </div>

        {connectedLeaguesLoading ? (
          <LoadingStateRenderer label="Loading your connected leagues..." testId="dashboard-home-leagues-loading" />
        ) : connectedLeaguesError ? (
          <ErrorStateRenderer
            title="Unable to load connected leagues"
            message={connectedLeaguesError}
            onRetry={() => void handleRetryConnectedLeagues()}
            testId="dashboard-home-leagues-error"
          />
        ) : groupedConnectedLeagues.length ? (
          <div className="space-y-5">
            {groupedConnectedLeagues.map((group) => (
              <div key={group.sport}>
                <div className="mb-3 flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${group.sport === "NFL" ? "bg-cyan-400" : group.sport === "NBA" ? "bg-orange-400" : group.sport === "NHL" ? "bg-blue-400" : group.sport === "MLB" ? "bg-rose-400" : group.sport === "NCAAF" ? "bg-emerald-400" : group.sport === "NCAAB" ? "bg-violet-400" : "bg-green-400"}`} />
                  <span className="text-xs font-bold uppercase tracking-[0.18em] text-white">
                    {group.label}
                  </span>
                  <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-400">
                    {group.leagues.length}
                  </span>
                </div>

                <div className="space-y-2">
                  {group.leagues.map((league) => {
                    const leagueMeta = league as DashboardLeague
                    const sport = normalizeToSupportedSport(
                      typeof leagueMeta.sport === "string"
                        ? leagueMeta.sport
                        : typeof leagueMeta.sport_type === "string"
                          ? leagueMeta.sport_type
                          : group.sport
                    )
                    const statusMeta = getLeagueStatusMeta(leagueMeta.syncStatus || leagueMeta.status)
                    const isCurrent = selectedConnectedLeague?.id === league.id

                    return (
                      <Link
                        key={league.id}
                        href={`/app/league/${league.id}`}
                        className={`flex items-center gap-3 rounded-[20px] border p-4 transition ${
                          isCurrent
                            ? "border-cyan-400/30 bg-cyan-400/10"
                            : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                        }`}
                      >
                        <div className={`h-full w-1 self-stretch rounded-full ${sport === "NFL" ? "bg-cyan-400" : sport === "NBA" ? "bg-orange-400" : sport === "NHL" ? "bg-blue-400" : sport === "MLB" ? "bg-rose-400" : sport === "NCAAF" ? "bg-emerald-400" : sport === "NCAAB" ? "bg-violet-400" : "bg-green-400"}`} />
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.06] text-xl">
                          {getSportEmoji(sport)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate text-base font-bold text-white">
                              {league.name || "Unnamed League"}
                            </p>
                            {leagueMeta.season ? (
                              <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                                {leagueMeta.season}
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs font-semibold text-cyan-200">
                            {formatVariantLabel(leagueMeta)} · {(leagueMeta.platform || "custom").toUpperCase()}
                          </p>
                          <p className="mt-1 text-sm text-slate-300">
                            {leagueMeta.leagueSize || "?"}-team · {leagueMeta.isDynasty ? "Dynasty" : "Seasonal"} · {connectedPlatforms.join(" · ") || "Connected"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusMeta.className}`}>
                              {statusMeta.label}
                            </span>
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
                              {getSportSectionLabel(sport || group.sport)}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-black text-white">
                            {leagueMeta.leagueSize || league.memberCount || "--"}
                          </p>
                          <p className="text-[11px] text-slate-400">teams</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyStateRenderer
            title="No leagues yet"
            description="Create a league, import history, or connect a provider to unlock the full dashboard workflow."
            actions={[
              {
                id: "create-league-home",
                label: "Create League",
                href: "/create-league",
              },
              {
                id: "import-league-home",
                label: "Import League",
                href: "/import",
              },
            ]}
            testId="dashboard-home-empty"
          />
        )}
      </section>

      {retentionNudges.length ? (
        <section className="rounded-[24px] border border-white/10 bg-[#16102a] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                Recommended next
              </p>
              <h3 className="mt-1 text-lg font-black text-white">Keep momentum going</h3>
            </div>
            <Link href="/tools-hub" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
              Open tools
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {retentionNudges.slice(0, 3).map((nudge) => (
              <Link
                key={nudge.id}
                href={nudge.href}
                className="rounded-[20px] border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.08]"
              >
                <p className="text-sm font-bold text-white">{nudge.title}</p>
                <p className="mt-1 text-xs text-slate-300">{nudge.body}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )

  const renderLeaguesTab = () => (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Connected league workspace</p>
            <h2 className="mt-2 text-3xl font-black text-white">My leagues</h2>
            <p className="mt-2 text-sm text-slate-300">Grouped by sport with direct access to live league tools and sync workflows.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/create-league" className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950">Create League</Link>
            <Link href="/import" className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white">Import League</Link>
            <button
              type="button"
              onClick={() => void handleRefreshDashboard()}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-white"
              aria-label="Refresh league summaries"
            >
              <RefreshCw className={`h-4 w-4 ${refreshingDashboard ? "animate-spin" : ""}`} />
              {refreshingDashboard ? "Refreshing..." : "Refresh"}
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSportFilter(ALL_SPORTS_FILTER)}
            data-sport-filter="ALL"
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              sportFilter === ALL_SPORTS_FILTER
                ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                : "border-white/15 bg-white/[0.04] text-slate-200"
            }`}
          >
            All sports
          </button>
          {SUPPORTED_SPORTS.map((sport) => (
            <button
              key={sport}
              type="button"
              onClick={() => setSportFilter(sport)}
              data-sport-filter={sport}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                sportFilter === sport
                  ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                  : "border-white/15 bg-white/[0.04] text-slate-200"
              }`}
            >
              {getSportSectionLabel(sport)}
            </button>
          ))}
        </div>
      </section>

      {connectedLeaguesLoading ? (
        <LoadingStateRenderer
          label="Loading your connected leagues..."
          testId="dashboard-leagues-loading-state"
        />
      ) : connectedLeaguesError ? (
        <ErrorStateRenderer
          title="Unable to load connected leagues"
          message={connectedLeaguesError}
          onRetry={() => void handleRetryConnectedLeagues()}
          actions={resolveRecoveryActions("dashboard").map((action) => ({
            id: action.id,
            label: action.label,
            href: action.href,
          }))}
          testId="dashboard-leagues-error-state"
        />
      ) : groupedConnectedLeagues.length ? (
        groupedConnectedLeagues.map((group) => (
          <section key={group.sport} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5" data-dashboard-sport-group={group.sport}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">{group.emoji}</span>
                <h3 className="text-xl font-black text-white">{group.label}</h3>
              </div>
              <button
                type="button"
                onClick={() => toggleSportSection(group.sport)}
                aria-expanded={!collapsedSports[group.sport]}
                aria-controls={`dashboard-sport-group-${group.sport}`}
                className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1 text-xs font-semibold text-slate-200 hover:bg-white/[0.08]"
              >
                {collapsedSports[group.sport] ? "Expand" : "Collapse"}
                {collapsedSports[group.sport] ? (
                  <ChevronDown className="h-3.5 w-3.5 text-cyan-300" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5 text-cyan-300" />
                )}
              </button>
            </div>
            {!collapsedSports[group.sport] ? (
              <div id={`dashboard-sport-group-${group.sport}`} className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {group.leagues.map((league) => {
                  const leagueMeta = league as DashboardLeague
                  const variantLabel = formatVariantLabel(leagueMeta)
                  const href = `/app/league/${league.id}`
                  return (
                    <Link key={league.id} href={href} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.08]">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-2">
                          {leagueMeta.avatarUrl ? (
                            <img
                              src={leagueMeta.avatarUrl}
                              alt=""
                              className="h-8 w-8 rounded-full object-cover border border-white/15"
                              loading="lazy"
                            />
                          ) : (
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-[10px] font-semibold text-cyan-200">
                              {String(league.sport ?? league.sport_type ?? "NFL")
                                .toUpperCase()
                                .slice(0, 3)}
                            </span>
                          )}
                          <div className="min-w-0">
                          <p className="truncate text-lg font-bold text-white">{league.name || "Unnamed League"}</p>
                          <p className="mt-1 text-sm text-slate-300">{(league.platform || "custom").toUpperCase()} · {league.leagueSize || "?"}-team · {variantLabel} · {league.isDynasty ? "Dynasty" : "Redraft"}</p>
                          </div>
                        </div>
                        {selectedLeague?.id === league.id ? <span className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-1 text-[11px] text-cyan-200">Current</span> : null}
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                        <span>{league.syncStatus || leagueMeta.status || "Connected"}</span>
                        <span>{formatDateLabel(league.lastSyncedAt || leagueMeta.createdAt, formatInTimezone)}</span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : null}
          </section>
        ))
      ) : (
        <EmptyStateRenderer
          title={
            connectedLeagues.length > 0 && sportFilter !== ALL_SPORTS_FILTER
              ? `No connected ${getSportSectionLabel(sportFilter)} leagues found`
              : resolveNoResultsState({ context: "dashboard_leagues" }).title
          }
          description={
            connectedLeagues.length > 0 && sportFilter !== ALL_SPORTS_FILTER
              ? "Try another sport filter or clear filters to see every connected league."
              : resolveNoResultsState({ context: "dashboard_leagues" }).description
          }
          actions={[
            ...(connectedLeagues.length > 0 && sportFilter !== ALL_SPORTS_FILTER
              ? [
                  {
                    id: "clear-filter",
                    label: "Clear filters",
                    onClick: () => setSportFilter(ALL_SPORTS_FILTER),
                    testId: "dashboard-clear-sport-filter",
                  },
                ]
              : []),
            ...resolveNoResultsState({ context: "dashboard_leagues" }).actions.map((action) => ({
              id: action.id,
              label: action.label,
              href: action.href,
            })),
          ]}
          testId="dashboard-leagues-empty-state"
        />
      )}
    </div>
  )

  const renderMatchupsTab = () => (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Current scoring period</p>
        <h2 className="mt-2 text-3xl font-black text-white">Matchups</h2>
        <p className="mt-2 text-sm text-slate-300">Open your active league matchup view, compare teams, and run simulation scenarios without leaving the dashboard workflow.</p>
      </section>
      <div className="grid gap-4 xl:grid-cols-3">
        <Link href={matchupsHref} className="rounded-3xl border border-cyan-400/20 bg-[linear-gradient(140deg,rgba(18,31,63,0.92),rgba(32,63,112,0.82))] p-5 hover:border-cyan-300/30">
          <p className="text-xs uppercase tracking-[0.16em] text-cyan-200/80">Selected league</p>
          <p className="mt-2 text-2xl font-black text-white">{selectedLeague?.name || "No league selected"}</p>
          <p className="mt-2 text-sm text-slate-200">Open live matchups, projections, and weekly results in your league view.</p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-cyan-200">Open Matchups <ArrowRight className="h-4 w-4" /></span>
        </Link>
        <Link href="/matchup-simulator" className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.08]">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Simulation</p>
          <p className="mt-2 text-2xl font-black text-white">Matchup Simulator</p>
          <p className="mt-2 text-sm text-slate-300">Run scenario-based simulations for weekly matchup swings and upside cases.</p>
        </Link>
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Competitive pulse</p>
          <p className="mt-2 text-2xl font-black text-white">Top standings movers</p>
          <div className="mt-4 space-y-2">
            {standings.length ? standings.slice(0, 3).map((row, index) => (
              <div key={row.entryId} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <p className="text-sm font-bold text-white">{index + 1}. {row.entryName}</p>
                <p className="text-xs text-slate-400">{row.totalPoints} pts · {row.displayName || "Manager"}</p>
              </div>
            )) : <p className="text-sm text-slate-300">Standings data will populate after league scoring is available.</p>}
          </div>
        </section>
      </div>
    </div>
  )

  const renderSportsTab = () => (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Live sports hub</p>
        <h2 className="mt-2 text-3xl font-black text-white">Sports</h2>
        <p className="mt-2 text-sm text-slate-300">Use sport-specific pages, fresh headlines, and weather context from live API routes.</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Fantasy Football", href: "/sports/fantasy-football" },
          { label: "Fantasy Hockey", href: "/sports/fantasy-hockey" },
          { label: "Fantasy Baseball", href: "/sports/fantasy-baseball" },
          { label: "Fantasy Basketball", href: "/sports/fantasy-basketball" },
          { label: "NCAA Football Fantasy", href: "/sports/ncaa-football-fantasy" },
          { label: "NCAA Basketball Fantasy", href: "/sports/ncaa-basketball-fantasy" },
          { label: "Fantasy Soccer", href: "/sports/fantasy-soccer" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.08]">
            <p className="text-sm uppercase tracking-[0.16em] text-slate-400">Sport page</p>
            <p className="mt-2 text-xl font-black text-white">{item.label}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-cyan-200">Open <ArrowRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-3xl border border-cyan-400/15 bg-[linear-gradient(130deg,rgba(20,42,65,0.9),rgba(30,20,66,0.82))] p-5">
          <div className="flex items-center gap-2">
            <CloudSun className="h-5 w-5 text-cyan-200" />
            <p className="text-xs uppercase tracking-[0.16em] text-cyan-100/80">Game weather</p>
          </div>
          {sportsWeatherLoading ? (
            <p className="mt-4 text-sm text-slate-200">Loading weather context...</p>
          ) : sportsWeather ? (
            <div className="mt-4 space-y-2">
              <p className="text-2xl font-black text-white">{sportsWeather.team} · {sportsWeather.venue}</p>
              <p className="text-sm text-slate-200">{sportsWeather.summary}</p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white">Temp: {sportsWeather.temperature}</div>
                <div className="rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white">Wind: {sportsWeather.wind}</div>
              </div>
              <p className="text-xs text-slate-300">{sportsWeather.isDome ? "Dome game" : "Outdoor game"} · source {sportsWeather.source}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-200">Weather is unavailable right now.</p>
          )}
          <Link href="/weather/game" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-cyan-200">Open weather center <ArrowRight className="h-4 w-4" /></Link>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-cyan-300" />
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Latest sports headlines</p>
            </div>
            <Link href="/fantasy-news" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">Open news</Link>
          </div>
          <div className="mt-3 space-y-2">
            {sportsNewsLoading ? (
              <p className="text-sm text-slate-300">Loading headlines...</p>
            ) : sportsNews.length ? (
              sportsNews.map((item) => {
                const card = (
                  <>
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-slate-400">{item.source} · {formatDateLabel(item.publishedAt, formatInTimezone)}</p>
                  </>
                )
                if (item.href) {
                  return <Link key={item.id} href={item.href} className="block rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 hover:bg-white/[0.08]">{card}</Link>
                }
                return <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">{card}</div>
              })
            ) : (
              <p className="text-sm text-slate-300">No headlines available right now.</p>
            )}
          </div>
        </section>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "NFL", href: "/fantasy-football", icon: Goal },
          { label: "NHL", href: "/fantasy-hockey", icon: Activity },
          { label: "MLB", href: "/fantasy-baseball", icon: Activity },
          { label: "NBA", href: "/fantasy-basketball", icon: Activity },
          { label: "NCAA Football", href: "/sports/ncaa-football-fantasy", icon: Goal },
          { label: "NCAA Basketball", href: "/sports/ncaa-basketball-fantasy", icon: Activity },
          { label: "SOCCER", href: "/fantasy-soccer", icon: Goal },
        ].map((sport) => (
          <Link key={sport.href} href={sport.href} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.08]">
            <sport.icon className="h-5 w-5 text-cyan-300" />
            <p className="mt-2 text-lg font-black text-white">{sport.label}</p>
            <p className="mt-1 text-sm text-slate-300">Open dedicated sport tools and league content.</p>
          </Link>
        ))}
      </div>
    </div>
  )

  const renderTeamTab = () => (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Roster control center</p>
        <h2 className="mt-2 text-3xl font-black text-white">Team</h2>
        <p className="mt-2 text-sm text-slate-300">Snapshot of your current roster, bench depth, and direct actions into lineup and player research flows.</p>
      </section>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Roster snapshot</p>
              <h3 className="mt-2 text-2xl font-black text-white">{selectedLeague?.name || "Current roster"}</h3>
            </div>
            <Link href={teamHref} className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">Open roster</Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {rosterLoading ? (
              <p className="text-sm text-slate-300">Loading roster...</p>
            ) : rosterAssets.length ? (
              rosterAssets.map((asset, index) => (
                <div key={`${asset}-${index}`} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white">{asset}</div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-slate-300">No roster preview available for this league yet. Use the open roster action to view the full lineup page.</div>
            )}
          </div>
        </section>
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Quick actions</p>
          <div className="mt-4 space-y-3">
            <Link href={teamHref} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white hover:bg-white/[0.08]">
              <span>Set lineup or open roster</span>
              <ChevronRight className="h-4 w-4 text-cyan-300" />
            </Link>
            <Link href="/player-comparison" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white hover:bg-white/[0.08]">
              <span>Compare players</span>
              <ChevronRight className="h-4 w-4 text-cyan-300" />
            </Link>
            <Link href={selectedLeague ? `/app/league/${selectedLeague.id}?tab=Players` : "/player-comparison"} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white hover:bg-white/[0.08]">
              <span>Open player finder</span>
              <ChevronRight className="h-4 w-4 text-cyan-300" />
            </Link>
            <Link href={waiverAiHref} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-white hover:bg-white/[0.08]">
              <span>Check waiver priorities</span>
              <ChevronRight className="h-4 w-4 text-cyan-300" />
            </Link>
          </div>
          <div className="mt-4 rounded-2xl border border-cyan-400/15 bg-cyan-400/5 p-4">
            <p className="text-sm font-semibold text-white">Team trends</p>
            <p className="mt-2 text-sm text-slate-300">{selectedTournamentEntries.length} tracked entries · highest score {Math.max(0, ...selectedTournamentEntries.map((entry) => entry.score || 0))}</p>
          </div>
        </section>
      </div>
    </div>
  )

  const renderToolsTab = () => (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Unified tools hub</p>
        <h2 className="mt-2 text-3xl font-black text-white">Tools</h2>
        <p className="mt-2 text-sm text-slate-300">Every tool card below opens a live modern route. No legacy skeleton shells, no coming-soon dead ends.</p>
      </section>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {toolCards.map((tool) => (
          <Link key={tool.title} href={tool.href} className={`rounded-3xl border border-white/10 bg-gradient-to-br ${tool.accent} p-5 hover:border-cyan-300/30`}>
            <p className="text-xl font-black text-white">{tool.title}</p>
            <p className="mt-2 text-sm text-slate-200">{tool.description}</p>
            <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-cyan-100">Open <ArrowRight className="h-4 w-4" /></span>
          </Link>
        ))}
      </div>
    </div>
  )

  const renderAiTab = () => (
    <div className="space-y-4">
      <section className="rounded-3xl border border-cyan-400/20 bg-[radial-gradient(90%_90%_at_0%_0%,rgba(34,211,238,0.10),transparent_55%),radial-gradient(90%_90%_at_100%_0%,rgba(147,51,234,0.18),transparent_55%),rgba(13,17,37,0.95)] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-cyan-200/80">League-aware AI</p>
        <h2 className="mt-2 text-3xl font-black text-white">AI</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-200">Use Chimmy and specialized AI shortcuts for trades, waivers, lineup decisions, and league recap workflows without dropping into old tool shells.</p>
      </section>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {aiShortcuts.map((action) => (
          <Link key={action.title} href={action.href} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.08]">
            <p className="text-xl font-black text-white">{action.title}</p>
            <p className="mt-2 text-sm text-slate-300">{action.subtitle}</p>
          </Link>
        ))}
      </div>
    </div>
  )

  const renderMessagesTab = () => (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Inbox and chat</p>
        <h2 className="mt-2 text-3xl font-black text-white">Messages</h2>
        <p className="mt-2 text-sm text-slate-300">League chat preview, DMs, AI private chats, and quick jump-in actions.</p>
      </section>
      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.16em] text-slate-400">League chat preview</p>
              <h3 className="mt-2 text-2xl font-black text-white">{selectedLeague?.name || "No league selected"}</h3>
            </div>
            <Link href="/messages" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">Open inbox</Link>
          </div>
          <div className="mt-4 max-h-[380px] space-y-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            {chatLoading ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-slate-300">Loading league chat...</div>
            ) : chatMessages.length ? (
              chatMessages.slice(-12).map((msg) => (
                <div key={msg.id} className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                  <p className="text-sm font-bold text-cyan-200">{msg.userName}</p>
                  <p className="mt-1 text-sm text-slate-200">{msg.message}</p>
                  <p className="mt-2 text-[11px] text-slate-400">{formatDateLabel(msg.createdAt, formatInTimezone)}</p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-slate-300">No league chat available for the current selection.</div>
            )}
          </div>
          {chatError ? <p className="mt-2 text-xs text-rose-300">{chatError}</p> : null}
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2">
            <input
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  void handleSendMessage()
                }
              }}
              placeholder={selectedLeague ? "Message the league" : "Select a league first"}
              disabled={!selectedLeague || postingMessage}
              className="w-full bg-transparent px-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
            />
            <button type="button" aria-label="Send league message" onClick={() => void handleSendMessage()} disabled={!selectedLeague || postingMessage || !newMessage.trim()} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400 text-slate-950 disabled:cursor-not-allowed disabled:opacity-50">
              <MessageSquare className="h-4 w-4" />
            </button>
          </div>
        </section>
        <section className="space-y-3">
          <Link href="/messages" className="block rounded-3xl border border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.08]">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Direct messages</p>
            <p className="mt-2 text-2xl font-black text-white">Open inbox</p>
            <p className="mt-2 text-sm text-slate-300">DMs, group threads, polls, media sharing, and league mentions.</p>
          </Link>
          <Link href={chimmyHref} className="block rounded-3xl border border-white/10 bg-white/[0.04] p-5 hover:bg-white/[0.08]">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">AI private chat</p>
            <p className="mt-2 text-2xl font-black text-white">Chimmy</p>
            <p className="mt-2 text-sm text-slate-300">Continue private AI conversations about trades, waivers, matchups, and league strategy.</p>
          </Link>
        </section>
      </div>
    </div>
  )

  const renderActivityTab = () => (
    <div className="space-y-4">
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Live platform feed</p>
        <h2 className="mt-2 text-3xl font-black text-white">Activity</h2>
        <p className="mt-2 text-sm text-slate-300">Recent trades, waiver movement, AI stories, matchup cards, and league updates.</p>
      </section>
      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
        {activityLoading ? (
          <p className="text-sm text-slate-300">Loading activity feed...</p>
        ) : activityItems.length ? (
          <div className="space-y-3">
            {activityItems.map((item) => {
              const content = (
                <>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 uppercase tracking-[0.1em]">{item.label}</span>
                    <span>{formatDateLabel(item.publishedAt, formatInTimezone)}</span>
                  </div>
                  <p className="mt-2 text-lg font-bold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-slate-300">{item.summary}</p>
                </>
              )
              if (item.href) {
                return <Link key={item.id} href={item.href} className="block rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.08]">{content}</Link>
              }
              return <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">{content}</div>
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-300">No recent activity available right now.</p>
        )}
      </section>
    </div>
  )

  const renderActiveTab = () => {
    if (activeTab === "Home") return renderHomeTab()
    if (activeTab === "My Leagues") return renderLeaguesTab()
    if (activeTab === "Sports") return renderSportsTab()
    if (activeTab === "Matchups") return renderMatchupsTab()
    if (activeTab === "Team") return renderTeamTab()
    if (activeTab === "Tools") return renderToolsTab()
    if (activeTab === "AI") return renderAiTab()
    if (activeTab === "Messages") return renderMessagesTab()
    return renderActivityTab()
  }

  const handleMobileTabPress = useCallback(
    (tab: DashboardTab) => {
      if (!emptyState) {
        setActiveTab(tab)
        return
      }

      if (tab === "Messages") {
        router.push("/messages")
        return
      }

      if (tab === "Tools") {
        router.push("/tools-hub")
        return
      }

      if (typeof document === "undefined") {
        setActiveTab(tab)
        return
      }

      const targetId = tab === "Activity" ? "dashboard-mobile-activity" : "dashboard-mobile-leagues"
      const target = document.getElementById(targetId)
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" })
        return
      }

      setActiveTab(tab)
    },
    [emptyState, router]
  )

  return (
    <div className="min-h-screen bg-[#110b1e] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-violet-400/15 bg-[#16102a]/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1720px] items-center gap-3 px-3 py-3 md:px-4">
          <Link href="/" className="flex min-w-0 items-center gap-3">
            <img
              src="/af-crest.png"
              alt="AllFantasy crest"
              className="h-10 w-10 rounded-xl border border-cyan-400/20 bg-white/5 object-contain p-1"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-[0.28em] text-cyan-100">
                ALLFANTASY
              </p>
              <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                Dashboard
              </p>
            </div>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:block">
              <LanguageToggle />
            </div>
            <button
              type="button"
              onClick={() => void handleRefreshDashboard()}
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white hover:bg-white/[0.08]"
            >
              <RefreshCw className={`h-4 w-4 text-cyan-300 ${refreshingDashboard ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">
                {refreshingDashboard ? "Refreshing" : "Refresh"}
              </span>
            </button>
            <Link
              href="/settings"
              className="inline-flex min-h-[42px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white hover:bg-white/[0.08]"
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,#06b6d4,#3b82f6)] text-[11px] font-black text-white">
                {getInitials(displayName)}
              </span>
              <span className="hidden lg:inline">{displayName}</span>
              <ShieldCheck className="h-4 w-4 text-cyan-300" />
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1720px] gap-4 px-3 pb-24 pt-4 md:px-4 xl:grid-cols-[310px_minmax(0,1fr)_290px] xl:pb-8">
        <aside className="hidden min-h-[calc(100vh-180px)] flex-col overflow-hidden rounded-[28px] border border-violet-400/15 bg-[#16102a] xl:flex">
          <div className="border-b border-violet-400/15 p-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setChatPane("chimmy")}
                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  chatPane === "chimmy"
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                }`}
              >
                Chimmy
              </button>
              <button
                type="button"
                onClick={() => setChatPane("messages")}
                className={`rounded-2xl px-3 py-2 text-sm font-semibold transition ${
                  chatPane === "messages"
                    ? "bg-cyan-400 text-slate-950"
                    : "bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                }`}
              >
                Messages
              </button>
            </div>
          </div>

          {chatPane === "chimmy" ? (
            <>
              <div className="border-b border-violet-400/15 px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-200">
                    <Bot className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">Chimmy AI</p>
                    <p className="text-xs text-slate-400">League-aware private assistant</p>
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                <div className="max-w-[92%] rounded-[18px] rounded-tl-md bg-white/[0.05] px-4 py-3 text-sm text-slate-200">
                  Welcome back, {displayName}. I can help with trades, waivers, lineup moves,
                  and a quick recap of your current league context.
                </div>
                <div className="max-w-[92%] rounded-[18px] rounded-tl-md bg-white/[0.05] px-4 py-3 text-sm text-slate-200">
                  {selectedLeagueName !== "No league selected"
                    ? `Current focus: ${selectedLeagueName}. Open Chimmy for a league-specific breakdown or a trade review.`
                    : "Connect or create a league to unlock full league-aware guidance."}
                </div>

                <div className="space-y-2 pt-1">
                  {aiShortcuts.slice(0, 4).map((action) => (
                    <Link
                      key={action.title}
                      href={action.href}
                      className="block rounded-2xl border border-cyan-400/15 bg-cyan-400/[0.06] px-3 py-3 text-sm text-cyan-50 hover:bg-cyan-400/[0.12]"
                    >
                      <p className="font-semibold">{action.title}</p>
                      <p className="mt-1 text-xs text-cyan-100/70">{action.subtitle}</p>
                    </Link>
                  ))}
                </div>
              </div>
              <div className="border-t border-violet-400/15 p-4">
                <div className="grid gap-2">
                  <Link
                    href={safeChimmyHref}
                    className="inline-flex min-h-[44px] items-center justify-between rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
                  >
                    Open Chimmy
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <Link
                      href={tradeEvaluatorHref}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-200 hover:bg-white/[0.08]"
                    >
                      Trade help
                    </Link>
                    <Link
                      href={waiverAiHref}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-slate-200 hover:bg-white/[0.08]"
                    >
                      Waiver help
                    </Link>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="border-b border-violet-400/15 px-4 py-4">
                <p className="text-sm font-bold text-white">{selectedLeagueName}</p>
                <p className="text-xs text-slate-400">Live league chat preview</p>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {chatLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-slate-300">
                    Loading league chat...
                  </div>
                ) : chatPreviewMessages.length ? (
                  chatPreviewMessages.map((msg) => {
                    const mine = msg.userName === displayName
                    return (
                      <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[92%] rounded-[18px] px-4 py-3 text-sm ${
                            mine
                              ? "rounded-tr-md bg-[linear-gradient(135deg,#06b6d4,#3b82f6)] text-white"
                              : "rounded-tl-md bg-white/[0.05] text-slate-200"
                          }`}
                        >
                          <p className={`text-[11px] font-semibold ${mine ? "text-white/75" : "text-slate-400"}`}>
                            {msg.userName}
                          </p>
                          <p className="mt-1">{msg.message}</p>
                          <p className={`mt-2 text-[11px] ${mine ? "text-white/70" : "text-slate-500"}`}>
                            {formatDateLabel(msg.createdAt, formatInTimezone)}
                          </p>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-slate-300">
                    No league messages yet. Open the inbox or post the first update.
                  </div>
                )}
              </div>
              <div className="border-t border-violet-400/15 p-4">
                {chatError ? <p className="mb-2 text-xs text-rose-300">{chatError}</p> : null}
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2">
                  <input
                    value={newMessage}
                    onChange={(event) => setNewMessage(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault()
                        void handleSendMessage()
                      }
                    }}
                    placeholder={selectedLeague ? "Message the league" : "Select a league first"}
                    disabled={!selectedLeague || postingMessage}
                    className="w-full bg-transparent px-2 text-sm text-slate-200 outline-none placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    aria-label="Send league message"
                    onClick={() => void handleSendMessage()}
                    disabled={!selectedLeague || postingMessage || !newMessage.trim()}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-cyan-400 text-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                </div>
                <Link
                  href="/messages"
                  className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-cyan-200 hover:text-cyan-100"
                >
                  Open full inbox
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </>
          )}
        </aside>

        <section className="min-w-0 space-y-4">
        {activeTab !== "Home" ? (
          <section className="rounded-[28px] border border-violet-400/15 bg-[radial-gradient(120%_120%_at_0%_0%,rgba(34,211,238,0.14),transparent_45%),radial-gradient(90%_90%_at_100%_10%,rgba(168,85,247,0.16),transparent_52%),linear-gradient(180deg,rgba(17,14,38,0.98),rgba(11,8,26,0.96))] p-5 shadow-[0_0_60px_rgba(34,211,238,0.05)] md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200/80">
                  Welcome back
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-tight text-white md:text-4xl">
                  {displayName}
                </h1>
                <p className="mt-2 text-sm text-slate-300 md:text-base">
                  {heroLabel}. Keep league context, AI actions, tools, and messages in one
                  dense control center.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/create-league"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300"
                >
                  <PlusCircle className="h-4 w-4" />
                  Create League
                </Link>
                <Link
                  href="/import"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.08]"
                >
                  <Download className="h-4 w-4 text-cyan-300" />
                  Import
                </Link>
                <Link
                  href="/find-league"
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/[0.08]"
                >
                  <LayoutGrid className="h-4 w-4 text-cyan-300" />
                  Find League
                </Link>
              </div>
            </div>
          </section>
        ) : null}

          {(resolvedDashboardPayload.needsSetup || !profile.sleeperUsername) && resolvedDashboardPayload.setupAlerts.length ? (
            <section className="rounded-[24px] border border-amber-400/15 bg-amber-500/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-amber-100/80">
                    Setup checklist
                  </p>
                  <p className="mt-1 text-sm text-amber-50">
                    Finish the remaining setup items so league-aware tools and AI stay fully
                    enabled.
                  </p>
                </div>
                <Link
                  href="/settings"
                  className="rounded-xl border border-amber-200/20 px-4 py-2 text-sm font-semibold text-amber-50 hover:bg-white/5"
                >
                  Open settings
                </Link>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {compactChecklist.map((item) => (
                  <span
                    key={item.label}
                    className={`rounded-full border px-3 py-1 text-xs ${
                      item.complete
                        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                        : "border-amber-400/15 bg-white/[0.04] text-amber-100"
                    }`}
                  >
                    {item.complete ? "Complete" : "Needs action"} · {item.label}
                  </span>
                ))}
              </div>
            </section>
          ) : null}

          {connectedLeaguesError ? (
            <ErrorStateRenderer
              compact
              title="League sync issue"
              message={connectedLeaguesError}
              onRetry={() => void handleRetryConnectedLeagues()}
              actions={resolveRecoveryActions("dashboard").map((action) => ({
                id: action.id,
                label: action.label,
                href: action.href,
              }))}
              testId="dashboard-top-error-state"
            />
          ) : null}

          {activeTab !== "Home" ? (
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <section className="rounded-[24px] border border-white/10 bg-[#16102a] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Current league context
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">{selectedLeagueName}</h2>
                  <p className="mt-2 text-sm text-slate-300">
                    League-first routing keeps tools, AI, matchups, roster actions, and chat tied
                    to the right competition.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full border px-3 py-1 ${getSportAccentClasses(selectedSport)}`}>
                    {selectedSportLabel}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
                    {(selectedConnectedLeague?.platform || "bracket").toUpperCase()}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
                    {formatVariantLabel(selectedConnectedLeague || {})}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1">
                    {selectedConnectedLeague?.leagueSize || selectedLeague?.memberCount || 0}-team
                  </span>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Link
                  href={leagueSummaryHref}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.08]"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">League home</p>
                  <p className="mt-2 text-base font-bold text-white">Open current league</p>
                </Link>
                <Link
                  href={draftHref}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.08]"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Draft room</p>
                  <p className="mt-2 text-base font-bold text-white">Jump into draft flow</p>
                </Link>
                <Link
                  href={waiverAiHref}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.08]"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Waiver AI</p>
                  <p className="mt-2 text-base font-bold text-white">Open waiver priorities</p>
                </Link>
                <Link
                  href={tradeAnalyzerHref}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 hover:bg-white/[0.08]"
                >
                  <p className="text-xs uppercase tracking-[0.14em] text-slate-400">Trade analyzer</p>
                  <p className="mt-2 text-base font-bold text-white">Analyze the market</p>
                </Link>
              </div>
            </section>

            <section className="rounded-[24px] border border-white/10 bg-[#16102a] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Standings snapshot
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-white">League table</h2>
                </div>
                <Link
                  href={`${leagueSummaryHref}?tab=Standings%20/%20Playoffs`}
                  className="text-sm font-semibold text-cyan-300 hover:text-cyan-200"
                >
                  Open full standings
                </Link>
              </div>
              <div className="mt-4 space-y-2">
                {standingsLoading ? (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-slate-300">
                    Loading standings...
                  </div>
                ) : standings.length ? (
                  standings.slice(0, 5).map((row, index) => (
                    <div
                      key={row.entryId}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-white">
                          {index + 1}. {row.entryName}
                        </p>
                        <p className="text-xs text-slate-400">
                          {row.displayName || "Manager"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-cyan-300">{row.totalPoints}</p>
                        <p className="text-xs text-slate-400">
                          {row.correctPicks || 0}/{row.totalPicks || 0} correct
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-6 text-sm text-slate-300">
                    Standings will appear once this league has scored entries.
                  </div>
                )}
              </div>
            </section>
          </div>
          ) : null}

          {emptyState ? (
            <div id="dashboard-mobile-leagues">
              <EmptyStateRenderer
                title="No leagues yet"
                description="Create a league, join bracket challenge, import history, or connect a provider to unlock the full dashboard workflow."
                actions={[
                  {
                    id: "create-league",
                    ...resolveFallbackRoute("create_league"),
                    testId: "dashboard-empty-create-league",
                  },
                  {
                    id: "join-bracket",
                    ...resolveFallbackRoute("join_bracket"),
                    testId: "dashboard-empty-join-bracket",
                  },
                  {
                    id: "import-league",
                    ...resolveFallbackRoute("import_league"),
                    testId: "dashboard-empty-import-league",
                  },
                  {
                    id: "connect-provider",
                    ...resolveFallbackRoute("connect_provider"),
                    testId: "dashboard-empty-connect-provider",
                  },
                  {
                    id: "ask-chimmy",
                    ...resolveFallbackRoute("ask_chimmy"),
                    testId: "dashboard-empty-ask-chimmy",
                  },
                ]}
                testId="dashboard-global-empty-state"
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-[#16102a] p-2">
                <div className="flex min-w-max gap-2">
                  {DASHBOARD_TABS.map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      data-dashboard-tab={tab}
                      aria-pressed={activeTab === tab}
                      className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                        activeTab === tab
                          ? "bg-cyan-400 text-slate-950"
                          : "bg-white/[0.04] text-slate-200 hover:bg-white/[0.08]"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {renderActiveTab()}
            </>
          )}
        </section>

        <aside className="hidden space-y-4 xl:block">
          <section className="rounded-[28px] border border-violet-400/15 bg-[#16102a] p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Leagues</p>
                <h3 className="mt-1 text-xl font-black text-white">Quick switcher</h3>
              </div>
              <Link
                href="/create-league"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-cyan-300 hover:bg-white/[0.08]"
              >
                <PlusCircle className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-4 space-y-2">
              {rightRailLeagues.length ? (
                rightRailLeagues.map((league) => (
                  <button
                    key={league.id}
                    type="button"
                    onClick={() => setSelectedLeagueId(league.id)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                      selectedLeague?.id === league.id
                        ? "border-cyan-400/30 bg-cyan-400/10"
                        : "border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.06] text-[11px] font-bold text-cyan-200">
                        {getInitials(league.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{league.name}</p>
                        <p className="text-xs text-slate-400">
                          {league.memberCount} members · Tier {league.leagueTier}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-5 text-sm text-slate-300">
                  No dashboard-visible leagues yet.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-violet-400/15 bg-[#16102a] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Current league rail</p>
            <h3 className="mt-2 text-2xl font-black text-white">{selectedLeagueName}</h3>
            <p className="mt-2 text-sm text-slate-300">
              Use this panel to keep every tool and AI action scoped to the right competition.
            </p>
            <div className="mt-4 space-y-2 text-sm text-slate-300">
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <span>Platform</span>
                <span className="font-semibold text-white">
                  {(selectedConnectedLeague?.platform || "bracket").toUpperCase()}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <span>Sport</span>
                <span className="font-semibold text-white">{selectedSportLabel}</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <span>Variant</span>
                <span className="font-semibold text-white">
                  {formatVariantLabel(selectedConnectedLeague || {})}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2">
                <span>Status</span>
                <span className="font-semibold text-white">
                  {selectedConnectedLeague?.syncStatus || selectedConnectedLeague?.status || "Ready"}
                </span>
              </div>
            </div>
            {inviteLink ? (
              <button
                type="button"
                onClick={handleCopyInvite}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-bold text-slate-950 hover:bg-cyan-300"
              >
                <Copy className="h-4 w-4" />
                {copyStatus === "copied"
                  ? "Invite copied"
                  : copyStatus === "failed"
                    ? "Copy invite again"
                    : "Copy invite link"}
              </button>
            ) : null}
          </section>

          <section className="rounded-[28px] border border-violet-400/15 bg-[#16102a] p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Quick open</p>
            <div className="mt-3 space-y-2">
              <Link
                href={leagueSummaryHref}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]"
              >
                <span className="flex items-center gap-2">
                  <LayoutGrid className="h-4 w-4 text-cyan-300" />
                  League Home
                </span>
                <ChevronRight className="h-4 w-4 text-cyan-300" />
              </Link>
              <Link
                href="/messages"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]"
              >
                <span className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-cyan-300" />
                  Inbox
                </span>
                <ChevronRight className="h-4 w-4 text-cyan-300" />
              </Link>
              <Link
                href={safeChimmyHref}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]"
              >
                <span className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-cyan-300" />
                  Chimmy
                </span>
                <ChevronRight className="h-4 w-4 text-cyan-300" />
              </Link>
              <Link
                href="/tools-hub"
                data-testid="dashboard-open-tools-hub-link"
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white hover:bg-white/[0.08]"
              >
                <span className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-cyan-300" />
                  Tools Hub
                </span>
                <ChevronRight className="h-4 w-4 text-cyan-300" />
              </Link>
            </div>
          </section>
        </aside>
      </div>

      <footer id="dashboard-mobile-activity" className="border-t border-violet-400/15 bg-[#16102a]">
        <div className="border-b border-violet-400/15">
          <div className="mx-auto flex w-full max-w-[1720px] flex-wrap items-center gap-2 px-3 py-3 md:px-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
              Updates
            </span>
            {updateItems.length ? (
              updateItems.map((item) =>
                item.href ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200 hover:bg-white/[0.08]"
                  >
                    <span className="h-2 w-2 rounded-full bg-cyan-300" />
                    {item.title}
                  </Link>
                ) : (
                  <div
                    key={item.id}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200"
                  >
                    <span className="h-2 w-2 rounded-full bg-cyan-300" />
                    {item.title}
                  </div>
                )
              )
            ) : (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-300">
                No recent dashboard updates
              </span>
            )}
            <Link href="/messages" className="ml-auto text-sm font-semibold text-cyan-300 hover:text-cyan-200">
              All →
            </Link>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1720px] px-3 py-4 md:px-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-white">Sports Feed</p>
              <p className="text-xs text-slate-400">
                NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, and Soccer
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setFeedSportFilter(ALL_SPORTS_FILTER)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                  feedSportFilter === ALL_SPORTS_FILTER
                    ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100"
                    : "border-white/10 bg-white/[0.04] text-slate-200"
                }`}
              >
                All
              </button>
              {SUPPORTED_SPORTS.map((sport) => (
                <button
                  key={sport}
                  type="button"
                  onClick={() => setFeedSportFilter(sport)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    feedSportFilter === sport
                      ? getSportAccentClasses(sport)
                      : "border-white/10 bg-white/[0.04] text-slate-200"
                  }`}
                >
                  {getSportSectionLabel(sport)}
                </button>
              ))}
              <Link href="/fantasy-news" className="text-sm font-semibold text-cyan-300 hover:text-cyan-200">
                View all →
              </Link>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-t-2xl border border-white/10 bg-white/[0.04]">
            <div className="inline-flex min-w-full divide-x divide-white/10">
              {sportsFeedItems.length ? (
                sportsFeedItems.map((item) => (
                  <div
                    key={`ticker-${item.id}`}
                    className="inline-flex items-center gap-3 px-4 py-3 text-sm text-slate-200"
                  >
                    <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getSportAccentClasses(item.sport)}`}>
                      {item.sport ? getSportSectionLabel(item.sport) : "Update"}
                    </span>
                    <span className="whitespace-nowrap">{item.title}</span>
                    <span className="text-xs text-slate-500">
                      {formatDateLabel(item.publishedAt, formatInTimezone)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="px-4 py-3 text-sm text-slate-300">
                  No sports feed items are available right now.
                </div>
              )}
            </div>
          </div>

          <div className="mt-px flex gap-px overflow-x-auto rounded-b-2xl bg-white/10">
            {sportsFeedItems.length ? (
              sportsFeedItems.map((item) => {
                const cardContent = (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getSportAccentClasses(item.sport)}`}>
                        {item.sport ? getSportSectionLabel(item.sport) : "Update"}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {formatDateLabel(item.publishedAt, formatInTimezone)}
                      </span>
                    </div>
                    <p className="mt-3 line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
                    <p className="mt-2 text-xs text-slate-400">{item.source}</p>
                  </>
                )

                if (item.href) {
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="min-w-[280px] flex-1 bg-[#16102a] p-4 hover:bg-[#1c1535]"
                    >
                      {cardContent}
                    </Link>
                  )
                }

                return (
                  <div key={item.id} className="min-w-[280px] flex-1 bg-[#16102a] p-4">
                    {cardContent}
                  </div>
                )
              })
            ) : null}
          </div>
        </div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-violet-400/15 bg-[#16102a]/95 px-3 py-2 backdrop-blur md:hidden">
        <div className="grid grid-cols-4 gap-2">
          {(["My Leagues", "Messages", "Tools", "Activity"] as DashboardTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => handleMobileTabPress(tab)}
              className={`rounded-2xl px-3 py-2 text-xs font-semibold ${
                activeTab === tab
                  ? "bg-cyan-400 text-slate-950"
                  : "bg-white/[0.04] text-slate-200"
              }`}
            >
              {tab === "My Leagues" ? "Leagues" : tab}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

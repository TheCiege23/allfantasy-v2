"use client"

import { useCallback, useState } from "react"
import { useSession } from "next-auth/react"
import { useGMLeaderboard } from "@/hooks/useGMLeaderboard"
import type { ManagerFranchiseProfileRow } from "@/hooks/useGMLeaderboard"
import { useXPProfile } from "@/hooks/useXPProfile"
import { useXPLeaderboard } from "@/hooks/useXPLeaderboard"
import { useCareerPrestigeProfile, useLeaguePrestige, useCareerLeaderboard } from "@/hooks/useCareerPrestige"
import type { LeagueTabProps } from "@/components/app/tabs/types"
import { RefreshCw, Building2, Zap, Crown, Sparkles } from "lucide-react"
import { XPTierBadge } from "@/components/XPTierBadge"
import { XPProgressBar } from "@/components/XPProgressBar"

export default function CareerTab({ leagueId }: LeagueTabProps) {
  const { data: session } = useSession()
  const managerId = (session?.user as { id?: string })?.id ?? null

  const { profile: careerProfile, loading: careerProfileLoading, refresh: refreshCareerProfile } = useCareerPrestigeProfile(managerId, leagueId || null)
  const { summary: leaguePrestige, loading: leaguePrestigeLoading, refresh: refreshLeaguePrestige } = useLeaguePrestige(leagueId || null)
  const { leaderboard: careerLeaderboard, loading: careerLeaderboardLoading, refresh: refreshCareerLeaderboard } = useCareerLeaderboard(leagueId || null)
  const [careerExplainNarrative, setCareerExplainNarrative] = useState<string | null>(null)
  const [careerExplainLoading, setCareerExplainLoading] = useState(false)
  const [prestigeRunLoading, setPrestigeRunLoading] = useState(false)

  const [orderBy, setOrderBy] = useState<"franchiseValue" | "gmPrestigeScore">("franchiseValue")
  const [runLoading, setRunLoading] = useState(false)
  const [explainManagerId, setExplainManagerId] = useState<string | null>(null)
  const [explainNarrative, setExplainNarrative] = useState<string | null>(null)
  const [explainLoading, setExplainLoading] = useState<string | null>(null)

  const [xpRunLoading, setXpRunLoading] = useState(false)
  const [xpExplainManagerId, setXpExplainManagerId] = useState<string | null>(null)
  const [xpExplainNarrative, setXpExplainNarrative] = useState<string | null>(null)
  const [xpExplainLoading, setXpExplainLoading] = useState<string | null>(null)
  const [xpTierFilter, setXpTierFilter] = useState<string>("")

  const { profile: xpProfile, loading: xpProfileLoading, refresh: refreshXPProfile } = useXPProfile(managerId)
  const { leaderboard: xpLeaderboard, loading: xpLeaderboardLoading, refresh: refreshXPLeaderboard } = useXPLeaderboard({
    tier: xpTierFilter || undefined,
    limit: 25,
  })

  const { profiles, total, loading, error, refresh } = useGMLeaderboard({
    orderBy,
    limit: 30,
  })

  const runEngine = useCallback(() => {
    setRunLoading(true)
    fetch("/api/gm-economy/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) })
      .then((r) => r.json())
      .then(() => refresh())
      .finally(() => setRunLoading(false))
  }, [refresh])

  const explain = useCallback((managerId: string) => {
    if (explainManagerId === managerId && explainNarrative !== null) {
      setExplainManagerId(null)
      setExplainNarrative(null)
      setExplainLoading(null)
      return
    }
    setExplainManagerId(managerId)
    setExplainNarrative(null)
    setExplainLoading(managerId)
    fetch("/api/gm-economy/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId }),
    })
      .then((r) => r.json())
      .then((data) => {
        setExplainNarrative(data?.narrative ?? "No explanation available.")
        setExplainLoading(null)
      })
      .catch(() => {
        setExplainNarrative("Could not load explanation.")
        setExplainLoading(null)
      })
  }, [explainManagerId, explainNarrative])

  const runXPEngine = useCallback(() => {
    setXpRunLoading(true)
    fetch("/api/xp/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(managerId ? { managerId } : {}) })
      .then((r) => r.json())
      .then(() => {
        refreshXPProfile()
        refreshXPLeaderboard()
      })
      .finally(() => setXpRunLoading(false))
  }, [managerId, refreshXPProfile, refreshXPLeaderboard])

  const explainCareer = useCallback(() => {
    setCareerExplainNarrative(null)
    setCareerExplainLoading(true)
    fetch("/api/career-prestige/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: managerId ?? undefined, leagueId: leagueId || undefined }),
    })
      .then((r) => r.json())
      .then((data) => setCareerExplainNarrative(data?.narrative ?? "No explanation available."))
      .catch(() => setCareerExplainNarrative("Could not load explanation."))
      .finally(() => setCareerExplainLoading(false))
  }, [managerId, leagueId])

  const runPrestigeEngines = useCallback(() => {
    setPrestigeRunLoading(true)
    fetch("/api/career-prestige/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leagueId: leagueId || undefined }),
    })
      .then(() => {
        refreshCareerProfile()
        refreshLeaguePrestige()
        refreshCareerLeaderboard()
        refresh()
        refreshXPProfile()
        refreshXPLeaderboard()
      })
      .finally(() => setPrestigeRunLoading(false))
  }, [leagueId, refreshCareerProfile, refreshLeaguePrestige, refreshCareerLeaderboard, refresh, refreshXPProfile, refreshXPLeaderboard])

  const explainXP = useCallback((mid: string) => {
    if (xpExplainManagerId === mid && xpExplainNarrative !== null) {
      setXpExplainManagerId(null)
      setXpExplainNarrative(null)
      setXpExplainLoading(null)
      return
    }
    setXpExplainManagerId(mid)
    setXpExplainNarrative(null)
    setXpExplainLoading(mid)
    fetch("/api/xp/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ managerId: mid }),
    })
      .then((r) => r.json())
      .then((data) => {
        setXpExplainNarrative(data?.narrative ?? "No explanation available.")
        setXpExplainLoading(null)
      })
      .catch(() => {
        setXpExplainNarrative("Could not load explanation.")
        setXpExplainLoading(null)
      })
  }, [xpExplainManagerId, xpExplainNarrative])

  return (
    <div className="space-y-4 p-4">
      {/* Career Prestige — unified dashboard */}
      <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-violet-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Career Prestige</h2>
              <p className="text-xs text-white/60">
                Unified view: GM Economy, XP, Reputation, Legacy, Hall of Fame, Awards, Record Books.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-xl bg-zinc-700 text-white px-3 py-2 text-sm disabled:opacity-60"
              disabled={careerProfileLoading || leaguePrestigeLoading || careerLeaderboardLoading}
              onClick={() => { refreshCareerProfile(); refreshLeaguePrestige(); refreshCareerLeaderboard() }}
            >
              <RefreshCw className="h-4 w-4 inline" /> Refresh
            </button>
            <button
              type="button"
              className="rounded-xl bg-violet-600 text-white px-3 py-2 text-sm disabled:opacity-60"
              disabled={prestigeRunLoading || !leagueId}
              onClick={runPrestigeEngines}
            >
              {prestigeRunLoading ? "Running…" : "Run all engines"}
            </button>
          </div>
        </div>
        {leagueId && leaguePrestige && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 mb-3">
            <h3 className="text-sm font-semibold text-white/80 mb-2">League prestige</h3>
            <p className="text-xs text-zinc-400">
              {leaguePrestige.managerCount} managers · GM: {leaguePrestige.gmEconomyCoverage} · XP: {leaguePrestige.xpCoverage} · Rep: {leaguePrestige.reputationCoverage} · Legacy: {leaguePrestige.legacyCoverage} · HoF: {leaguePrestige.hallOfFameEntryCount} · Awards: {leaguePrestige.awardsCount} · Records: {leaguePrestige.recordBookCount}
            </p>
          </div>
        )}
        {managerId && careerProfile && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 mb-3">
            <h3 className="text-sm font-semibold text-white/80 mb-2">Your prestige</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {careerProfile.gmEconomy?.tierLabel && (
                <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[10px] text-cyan-200">GM {careerProfile.gmEconomy.tierLabel}</span>
              )}
              {careerProfile.xp?.currentTier && (
                <XPTierBadge tier={careerProfile.xp.currentTier} />
              )}
              {careerProfile.reputation?.tier && (
                <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] text-amber-200">{careerProfile.reputation.tier}</span>
              )}
              {careerProfile.legacy && (
                <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-200">Legacy {careerProfile.legacy.overallLegacyScore.toFixed(0)}</span>
              )}
              {careerProfile.hallOfFameEntryCount > 0 && (
                <span className="text-xs text-zinc-400">HoF: {careerProfile.hallOfFameEntryCount}</span>
              )}
              {(careerProfile.awardsWonCount > 0 || careerProfile.recordsHeldCount > 0) && (
                <span className="text-xs text-zinc-400">Awards: {careerProfile.awardsWonCount} · Records: {careerProfile.recordsHeldCount}</span>
              )}
            </div>
            {careerProfile.timelineHints.length > 0 && (
              <p className="text-xs text-zinc-500 mb-2">Timeline: {careerProfile.timelineHints.slice(0, 3).join(" · ")}</p>
            )}
            <button
              type="button"
              className="flex items-center gap-1 rounded-lg bg-zinc-800 px-2 py-1 text-xs text-cyan-400 hover:bg-zinc-700 disabled:opacity-50"
              disabled={careerExplainLoading}
              onClick={explainCareer}
            >
              <Sparkles className="h-3 w-3" /> {careerExplainLoading ? "…" : "Explain my career"}
            </button>
            {careerExplainNarrative && (
              <div className="mt-2 rounded-lg bg-zinc-900 p-2 text-xs text-zinc-300">{careerExplainNarrative}</div>
            )}
          </div>
        )}
        {careerLeaderboard.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-2">Prestige leaderboard</h3>
            <div className="space-y-1">
              {careerLeaderboard.slice(0, 10).map((r) => (
                <div key={r.managerId} className="flex flex-wrap items-center gap-2 rounded-lg bg-zinc-900/50 px-2 py-1 text-sm">
                  <span className="text-zinc-500 w-5">#{r.rank}</span>
                  <span className="text-white font-medium">{r.managerId}</span>
                  <span className="text-cyan-400 font-mono text-xs">Prestige {r.prestigeScore}</span>
                  <span className="text-zinc-400 text-xs">Val {r.franchiseValue} · XP {r.totalXP} · Champs {r.championshipCount}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Career XP section */}
      <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Career XP &amp; Tier</h2>
              <p className="text-xs text-white/60">
                Earn XP from matchup wins, playoffs, championships, trades, season completion. Rise from Bronze GM to Legendary GM.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded-xl bg-zinc-700 text-white px-3 py-2 text-sm disabled:opacity-60"
              disabled={xpProfileLoading || xpLeaderboardLoading}
              onClick={() => { refreshXPProfile(); refreshXPLeaderboard() }}
            >
              <RefreshCw className={`h-4 w-4 inline ${xpProfileLoading || xpLeaderboardLoading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              type="button"
              className="rounded-xl bg-amber-600 text-white px-3 py-2 text-sm disabled:opacity-60"
              disabled={xpRunLoading}
              onClick={runXPEngine}
            >
              {xpRunLoading ? "Running…" : "Run XP engine"}
            </button>
          </div>
        </div>
        {managerId && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 mb-3">
            <h3 className="text-sm font-semibold text-white/80 mb-2">Your XP</h3>
            {xpProfileLoading ? (
              <div className="text-sm text-white/50">Loading…</div>
            ) : xpProfile ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <XPTierBadge tier={xpProfile.currentTier} tierBadgeColor={xpProfile.tierBadgeColor} />
                  <span className="text-cyan-400 font-mono text-sm">{xpProfile.totalXP} XP</span>
                </div>
                <XPProgressBar
                  progressInTier={xpProfile.progressInTier}
                  totalXP={xpProfile.totalXP}
                  xpToNextTier={xpProfile.xpToNextTier}
                  currentTier={xpProfile.currentTier}
                />
                <div className="flex flex-wrap gap-2 text-xs">
                  <button
                    type="button"
                    className="text-cyan-400 hover:underline disabled:opacity-50"
                    disabled={xpExplainLoading === managerId}
                    onClick={() => explainXP(managerId)}
                  >
                    {xpExplainLoading === managerId ? "…" : xpExplainManagerId === managerId && xpExplainNarrative ? "Hide" : "How did I earn this XP?"}
                  </button>
                  <button
                    type="button"
                    className="text-amber-400 hover:underline disabled:opacity-50"
                    disabled={xpExplainLoading === managerId}
                    onClick={() => explainXP(managerId)}
                  >
                    {xpExplainLoading === managerId ? "…" : "Explain"}
                  </button>
                </div>
                {xpExplainManagerId === managerId && xpExplainNarrative && (
                  <div className="mt-2 rounded-lg bg-zinc-900 p-2 text-xs text-zinc-300">
                    {xpExplainNarrative}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-white/60">No XP profile yet. Run the XP engine to compute from season results.</p>
            )}
          </div>
        )}
        <h3 className="text-sm font-semibold text-white/80 mb-2">XP Leaderboard</h3>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <select
            className="rounded-lg bg-zinc-950 border border-zinc-800 px-2 py-1 text-sm"
            value={xpTierFilter}
            onChange={(e) => setXpTierFilter(e.target.value)}
          >
            <option value="">All tiers</option>
            <option value="Bronze GM">Bronze GM</option>
            <option value="Silver GM">Silver GM</option>
            <option value="Gold GM">Gold GM</option>
            <option value="Elite GM">Elite GM</option>
            <option value="Legendary GM">Legendary GM</option>
          </select>
        </div>
        {xpLeaderboardLoading ? (
          <div className="text-sm text-white/50">Loading leaderboard…</div>
        ) : xpLeaderboard.length > 0 ? (
          <div className="space-y-2">
            {xpLeaderboard.map((row) => (
              <div key={row.managerId} className="rounded-xl border border-zinc-800 bg-zinc-950 p-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-500 w-6">#{row.rank}</span>
                    <span className="font-medium text-white text-sm">{row.managerId}</span>
                    <XPTierBadge tier={row.currentTier} />
                    <span className="text-cyan-400 font-mono text-sm">{row.totalXP} XP</span>
                  </div>
                  <button
                    type="button"
                    className="text-xs text-cyan-400 hover:underline disabled:opacity-50"
                    disabled={xpExplainLoading === row.managerId}
                    onClick={() => explainXP(row.managerId)}
                  >
                    {xpExplainLoading === row.managerId ? "…" : "Explain"}
                  </button>
                </div>
                {xpExplainManagerId === row.managerId && xpExplainNarrative && (
                  <div className="mt-2 rounded-lg bg-zinc-900 p-2 text-xs text-zinc-300">
                    {xpExplainNarrative}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/60">No XP data yet. Run the XP engine to build the leaderboard.</p>
        )}
      </div>

      <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-lg font-bold text-white">GM Career & Franchise Value</h2>
              <p className="text-xs text-white/60">
                Cross-league career progression: prestige, franchise value, championships, win rate.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="rounded-xl bg-zinc-950 border border-zinc-800 px-3 py-2 text-sm"
              value={orderBy}
              onChange={(e) => setOrderBy(e.target.value as "franchiseValue" | "gmPrestigeScore")}
            >
              <option value="franchiseValue">By franchise value</option>
              <option value="gmPrestigeScore">By GM prestige</option>
            </select>
            <button
              type="button"
              className="rounded-xl bg-zinc-700 text-white px-3 py-2 text-sm disabled:opacity-60"
              disabled={loading}
              onClick={() => refresh()}
            >
              <RefreshCw className={`h-4 w-4 inline ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
            <button
              type="button"
              className="rounded-xl bg-cyan-600 text-white px-3 py-2 text-sm disabled:opacity-60"
              disabled={runLoading}
              onClick={runEngine}
            >
              {runLoading ? "Running…" : "Run GM economy"}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {loading && (
        <div className="text-sm text-white/50">Loading leaderboard…</div>
      )}

      {!loading && profiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-white/80">
            Franchise leaderboard ({total})
          </h3>
          <div className="space-y-2">
            {profiles.slice(0, 25).map((p, idx) => (
              <GMCareerCard
                key={p.profileId}
                rank={idx + 1}
                profile={p}
                explainManagerId={explainManagerId}
                explainNarrative={explainNarrative}
                explainLoading={explainLoading}
                onExplain={() => explain(p.managerId)}
              />
            ))}
          </div>
        </div>
      )}

      {!loading && profiles.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/60">
          No franchise profiles yet. Click &quot;Run GM economy&quot; to compute career progression
          from league history (rosters, season results).
        </div>
      )}

      <p className="text-xs text-white/50">
        Supports NFL, NHL, NBA, MLB, NCAA Basketball, NCAA Football, Soccer. Data is aggregated from
        rosters and season results across all leagues.
      </p>
    </div>
  )
}

function GMCareerCard({
  rank,
  profile,
  explainManagerId,
  explainNarrative,
  explainLoading,
  onExplain,
}: {
  rank: number
  profile: ManagerFranchiseProfileRow
  explainManagerId: string | null
  explainNarrative: string | null
  explainLoading: string | null
  onExplain: () => void
}) {
  const tierColor =
    profile.tierBadgeColor === "amber"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : profile.tierBadgeColor === "emerald"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
        : profile.tierBadgeColor === "cyan"
          ? "border-cyan-500/30 bg-cyan-500/10 text-cyan-200"
          : "border-white/20 bg-white/5 text-white/70"

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500 w-6">#{rank}</span>
          <span className="font-medium text-white">{profile.managerId}</span>
          {profile.tierLabel && (
            <span
              className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-medium ${tierColor}`}
            >
              {profile.tierLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-cyan-400 font-mono">
            Value: {profile.franchiseValue.toFixed(0)}
          </span>
          <span className="text-amber-400 font-mono">
            Prestige: {profile.gmPrestigeScore.toFixed(1)}
          </span>
          <span className="text-xs text-zinc-400">
            {profile.championshipCount} titles · {(profile.careerWinPercentage * 100).toFixed(0)}% W
          </span>
          <button
            type="button"
            className="text-xs text-cyan-400 hover:underline disabled:opacity-50"
            disabled={explainLoading === profile.managerId}
            onClick={onExplain}
          >
            {explainLoading === profile.managerId
              ? "…"
              : explainManagerId === profile.managerId && explainNarrative
                ? "Hide"
                : "Explain career"}
          </button>
        </div>
      </div>
      {explainManagerId === profile.managerId && explainNarrative && (
        <div className="mt-2 rounded-lg bg-zinc-900 p-2 text-xs text-zinc-300">
          {explainNarrative}
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useCallback, useEffect, useMemo } from "react"
import { RefreshCw, DollarSign, ListOrdered, CheckCircle, Loader2, Trash2, ArrowUpDown } from "lucide-react"
import WaiverFilters from "@/components/waiver-wire/WaiverFilters"
import WaiverPlayerRow from "@/components/waiver-wire/WaiverPlayerRow"
import WaiverClaimDrawer from "@/components/waiver-wire/WaiverClaimDrawer"

const WAIVER_TYPES = [
  { value: "faab", label: "FAAB" },
  { value: "rolling", label: "Rolling Waivers" },
  { value: "reverse_standings", label: "Reverse Standings" },
  { value: "fcfs", label: "First Come First Served" },
  { value: "standard", label: "Standard" },
]

type WaiverSettings = {
  leagueId?: string
  waiverType?: string
  processingDayOfWeek?: number | null
  processingTimeUtc?: string | null
  claimLimitPerPeriod?: number | null
  faabBudget?: number | null
  tiebreakRule?: string | null
  instantFaAfterClear?: boolean
}

type Player = { id: string; name: string; position: string | null; team: string | null }
type Claim = {
  id: string
  addPlayerId: string
  dropPlayerId: string | null
  faabBid: number | null
  priorityOrder: number
  status: string
  roster?: { id: string; faabRemaining: number | null; waiverPriority: number | null }
}
type Transaction = {
  id: string
  addPlayerId: string
  dropPlayerId: string | null
  faabSpent: number | null
  processedAt: string
}

export default function WaiverWirePage({ leagueId }: { leagueId: string }) {
  const [settings, setSettings] = useState<WaiverSettings | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [claims, setClaims] = useState<Claim[]>([])
  const [history, setHistory] = useState<{ claims: Claim[]; transactions: Transaction[] }>({ claims: [], transactions: [] })
  const [loading, setLoading] = useState(true)
  const [claimLoading, setClaimLoading] = useState(false)
  const [faabRemaining, setFaabRemaining] = useState<number | null>(null)
  const [rosterPlayerIds, setRosterPlayerIds] = useState<string[]>([])
  const [waiverPriority, setWaiverPriority] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState<"available" | "pending" | "history">("available")

  const [search, setSearch] = useState("")
  const [positionFilter, setPositionFilter] = useState("ALL")
  const [statusFilter, setStatusFilter] = useState("all")
  const [teamFilter, setTeamFilter] = useState("")
  const [sort, setSort] = useState("name")

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerPlayer, setDrawerPlayer] = useState<Player | null>(null)
  const [pendingEdits, setPendingEdits] = useState<Record<string, { faabBid: string; priority: string }>>({})

  const load = useCallback(async () => {
    if (!leagueId) return
    setLoading(true)
    try {
      const [settingsRes, claimsRes, playersRes, rosterRes, historyRes] = await Promise.all([
        fetch(`/api/waiver-wire/leagues/${leagueId}/settings`),
        fetch(`/api/waiver-wire/leagues/${leagueId}/claims`),
        fetch(`/api/waiver-wire/leagues/${leagueId}/players?limit=80`),
        fetch(`/api/league/roster?leagueId=${leagueId}`),
        fetch(`/api/waiver-wire/leagues/${leagueId}/claims?type=history&limit=30`),
      ])
      const settingsData = await settingsRes.json().catch(() => ({}))
      const claimsData = await claimsRes.json().catch(() => ({}))
      const playersData = await playersRes.json().catch(() => ({}))
      const rosterData = await rosterRes.json().catch(() => ({}))
      const historyData = await historyRes.json().catch(() => ({}))
      if (!settingsRes.ok) setSettings(null)
      else setSettings(settingsData)
      if (!claimsRes.ok) setClaims([])
      else setClaims(Array.isArray(claimsData.claims) ? claimsData.claims : [])
      if (!playersRes.ok) setPlayers([])
      else setPlayers(Array.isArray(playersData.players) ? playersData.players : [])
      if (!historyRes.ok) setHistory({ claims: [], transactions: [] })
      else setHistory({ claims: historyData.claims ?? [], transactions: historyData.transactions ?? [] })
      const roster = rosterData.roster
      if (rosterData.faabRemaining != null) setFaabRemaining(rosterData.faabRemaining)
      if (rosterData.waiverPriority != null) setWaiverPriority(rosterData.waiverPriority)
      const ids = Array.isArray(roster) ? roster : (roster?.players ?? [])
      setRosterPlayerIds(ids.map((p: any) => (typeof p === "string" ? p : p?.id ?? p?.player_id ?? "")).filter(Boolean))
    } finally {
      setLoading(false)
    }
  }, [leagueId])

  useEffect(() => {
    load()
  }, [load])

  const submitClaimForPlayer = async (player: Player, opts: { dropPlayerId: string | null; faabBid: number | null; priorityOrder: number | null }) => {
    if (claimLoading) return
    setClaimLoading(true)
    try {
      const res = await fetch(`/api/waiver-wire/leagues/${leagueId}/claims`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addPlayerId: player.id,
          dropPlayerId: opts.dropPlayerId,
          faabBid: opts.faabBid,
          priorityOrder: opts.priorityOrder,
        }),
      })
      if (res.ok) {
        setDrawerOpen(false)
        setDrawerPlayer(null)
        load()
      }
    } finally {
      setClaimLoading(false)
    }
  }

  const cancelClaimById = async (claimId: string) => {
    const res = await fetch(`/api/waiver-wire/leagues/${leagueId}/claims/${claimId}`, { method: "DELETE" })
    if (res.ok) load()
  }

  const updateClaimById = async (claimId: string, patch: { faabBid?: number | null; priorityOrder?: number | null; dropPlayerId?: string | null }) => {
    const res = await fetch(`/api/waiver-wire/leagues/${leagueId}/claims/${claimId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    })
    if (res.ok) {
      load()
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    )
  }

  const isFaab = settings?.waiverType === "faab"
  const uniqueTeams = useMemo(
    () =>
      Array.from(
        new Set(players.map((p) => (p.team || "").trim()).filter((t) => t && t !== "FA")),
      ).sort(),
    [players],
  )

  const filteredPlayers = useMemo(() => {
    let list = [...players]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q) || p.team?.toLowerCase().includes(q))
    }
    if (positionFilter !== "ALL") {
      list = list.filter((p) => (p.position || "").toUpperCase().startsWith(positionFilter))
    }
    if (statusFilter === "available") {
      list = list
    }
    if (teamFilter) {
      const t = teamFilter.toLowerCase()
      list = list.filter((p) => (p.team || "").toLowerCase() === t)
    }
    if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name))
    } else if (sort === "position") {
      list.sort((a, b) => (a.position || "").localeCompare(b.position || ""))
    } else if (sort === "team") {
      list.sort((a, b) => (a.team || "").localeCompare(b.team || ""))
    }
    return list
  }, [players, search, positionFilter, statusFilter, sort])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <h1 className="text-lg font-semibold text-white sm:text-xl">Waiver Wire</h1>
          <p className="text-xs text-white/60">
            Browse free agents, submit claims, and track your FAAB and priority with rule-aware waiver tools.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isFaab && faabRemaining != null && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2.5 py-1 text-xs font-medium text-cyan-200 sm:text-sm">
              <DollarSign className="h-3.5 w-3.5" />
              FAAB: {faabRemaining}
            </span>
          )}
          {waiverPriority != null && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-black/30 px-2.5 py-1 text-xs text-white/80 sm:text-sm">
              <ListOrdered className="h-3.5 w-3.5" />
              Waiver priority: {waiverPriority}
            </span>
          )}
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 bg-black/20 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 sm:text-sm"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10 pb-2">
        {(["available", "pending", "history"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
              activeTab === tab ? "bg-cyan-500/20 text-cyan-200" : "text-white/70 hover:text-white"
            }`}
          >
            {tab === "available" && "Available players"}
            {tab === "pending" && `Pending claims (${claims.length})`}
            {tab === "history" && "Processed history"}
          </button>
        ))}
      </div>

      {activeTab === "available" && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-0 sm:p-3">
          <WaiverFilters
            search={search}
            onSearchChange={setSearch}
            position={positionFilter}
            onPositionChange={setPositionFilter}
            team={teamFilter}
            onTeamChange={setTeamFilter}
            status={statusFilter}
            onStatusChange={setStatusFilter}
            sort={sort}
            onSortChange={setSort}
            teams={uniqueTeams}
          />
          <ul className="max-h-[480px] space-y-1.5 overflow-y-auto px-1 pb-3 pt-1 sm:px-0">
            {filteredPlayers.length === 0 ? (
              <li className="py-6 text-center text-sm text-white/50">No players match your filters.</li>
            ) : (
              filteredPlayers.map((p) => {
                const alreadyClaimed = claims.some((c) => c.addPlayerId === p.id)
                return (
                  <WaiverPlayerRow
                    key={p.id}
                    player={p}
                    onAddClick={() => {
                      if (alreadyClaimed) return
                      setDrawerPlayer(p)
                      setDrawerOpen(true)
                    }}
                    alreadyClaimed={alreadyClaimed}
                  />
                )
              })
            )}
          </ul>
        </div>
      )}

      {activeTab === "pending" && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-white/60">
            <span>Manage claim order, bids, and drops before processing.</span>
            <span className="inline-flex items-center gap-1">
              <ArrowUpDown className="h-3 w-3" />
              Drag/prioritize in your host app; use numbers here to hint preferred order.
            </span>
          </div>
          <ul className="space-y-2">
            {claims.length === 0 ? (
              <li className="py-4 text-center text-sm text-white/50">No pending claims.</li>
            ) : (
              claims.map((c, idx) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-black/30 px-3 py-2"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-white/80">
                    <div className="flex flex-wrap items-center gap-2">
                      <ListOrdered className="h-4 w-4 text-white/50" />
                      <span className="text-sm text-white">
                        #{idx + 1} Add {c.addPlayerId}
                      </span>
                      {c.dropPlayerId && <span className="text-xs text-white/60">Drop {c.dropPlayerId}</span>}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/50">Priority</span>
                        <input
                          type="number"
                          min={0}
                          className="w-14 rounded border border-white/25 bg-black/40 px-1.5 py-0.5 text-[11px] text-white outline-none"
                          value={pendingEdits[c.id]?.priority ?? (c.priorityOrder ?? idx + 1).toString()}
                          onChange={(e) =>
                            setPendingEdits((prev) => ({
                              ...prev,
                              [c.id]: {
                                faabBid:
                                  prev[c.id]?.faabBid ??
                                  (c.faabBid != null ? c.faabBid.toString() : ""),
                                priority: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                      {isFaab && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-white/50">Bid</span>
                          <input
                            type="number"
                            min={0}
                            className="w-16 rounded border border-white/25 bg-black/40 px-1.5 py-0.5 text-[11px] text-white outline-none"
                            value={pendingEdits[c.id]?.faabBid ?? (c.faabBid != null ? c.faabBid.toString() : "")}
                            onChange={(e) =>
                              setPendingEdits((prev) => ({
                                ...prev,
                                [c.id]: {
                                  faabBid: e.target.value,
                                  priority:
                                    prev[c.id]?.priority ??
                                    (c.priorityOrder ?? idx + 1).toString(),
                                },
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const edit = pendingEdits[c.id]
                        const nextPriority = edit?.priority ?? (c.priorityOrder ?? idx + 1).toString()
                        const nextBidRaw = edit?.faabBid ?? (c.faabBid != null ? c.faabBid.toString() : "")
                        const patch: { faabBid?: number | null; priorityOrder?: number | null } = {}
                        if (nextPriority !== "") patch.priorityOrder = Number(nextPriority) || 0
                        if (isFaab && nextBidRaw !== "") patch.faabBid = Number(nextBidRaw) || 0
                        void updateClaimById(c.id, patch)
                      }}
                      className="rounded border border-cyan-400/60 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelClaimById(c.id)}
                      className="rounded border border-red-400/40 px-2 py-1 text-xs text-red-300 hover:bg-red-500/20"
                    >
                      <Trash2 className="mr-1 inline h-3 w-3" />
                      Cancel
                    </button>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}

      {activeTab === "history" && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <h3 className="mb-2 text-sm font-semibold text-white">Processed claims</h3>
          <ul className="space-y-1.5 text-sm">
            {history.transactions.length === 0 && history.claims.length === 0 ? (
              <li className="py-4 text-center text-sm text-white/50">No processed claims yet.</li>
            ) : (
              <>
                {history.transactions.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 text-white/90"
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span>
                      Add {t.addPlayerId}
                      {t.dropPlayerId && <> · Drop {t.dropPlayerId}</>}
                    </span>
                    {t.faabSpent != null && <span className="text-cyan-300">${t.faabSpent}</span>}
                    <span className="ml-auto text-xs text-white/50">
                      {new Date(t.processedAt).toLocaleString()}
                    </span>
                  </li>
                ))}
                {history.claims.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-white/90"
                  >
                    <span className="h-4 w-4 rounded-full border border-red-400/60 text-[10px] leading-4 text-red-300 text-center">
                      !
                    </span>
                    <span>
                      Failed claim for {c.addPlayerId}
                      {c.dropPlayerId && <> · Drop {c.dropPlayerId}</>}
                    </span>
                    {c.faabBid != null && <span className="text-cyan-300">${c.faabBid}</span>}
                    <span className="ml-auto text-xs text-white/50">
                      {c.status || "failed"}
                    </span>
                  </li>
                ))}
              </>
            )}
          </ul>
        </div>
      )}

      <section className="rounded-xl border border-white/10 bg-black/20 p-4">
        <h2 className="mb-2 text-sm font-semibold text-white">League waiver rules</h2>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-white/50">Type</dt>
            <dd className="text-white">
              {WAIVER_TYPES.find((t) => t.value === settings?.waiverType)?.label ?? settings?.waiverType ?? "—"}
            </dd>
          </div>
          {settings?.faabBudget != null && (
            <div>
              <dt className="text-white/50">FAAB budget</dt>
              <dd className="text-white">{settings.faabBudget}</dd>
            </div>
          )}
          {settings?.processingTimeUtc && (
            <div>
              <dt className="text-white/50">Process time (UTC)</dt>
              <dd className="text-white">{settings.processingTimeUtc}</dd>
            </div>
          )}
          {settings?.claimLimitPerPeriod != null && (
            <div>
              <dt className="text-white/50">Claim limit</dt>
              <dd className="text-white">
                {settings.claimLimitPerPeriod} per period
              </dd>
            </div>
          )}
          {settings?.tiebreakRule && (
            <div>
              <dt className="text-white/50">Tiebreaker</dt>
              <dd className="text-white">{settings.tiebreakRule}</dd>
            </div>
          )}
          {settings?.instantFaAfterClear != null && (
            <div>
              <dt className="text-white/50">After waivers clear</dt>
              <dd className="text-white">
                {settings.instantFaAfterClear ? "Instant free agency" : "Remains on waivers"}
              </dd>
            </div>
          )}
        </dl>
        <p className="mt-2 text-xs text-white/55">
          Roster and positional limits are enforced by your host league. If your roster is full or a player is
          ineligible for a slot, you may be required to choose a drop here or finalize moves directly on the host
          platform after claims process.
        </p>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 sm:inset-y-0 sm:right-0 sm:left-auto sm:items-stretch sm:px-0">
        <div className="w-full sm:h-full sm:max-w-md">
          <WaiverClaimDrawer
            open={drawerOpen}
            onClose={() => {
              if (!claimLoading) {
                setDrawerOpen(false)
                setDrawerPlayer(null)
              }
            }}
            player={drawerPlayer}
            faabMode={isFaab}
            faabRemaining={faabRemaining}
            rosterPlayerIds={rosterPlayerIds}
            onSubmit={async (opts) => {
              if (!drawerPlayer) return
              await submitClaimForPlayer(drawerPlayer, opts)
            }}
          />
        </div>
      </div>
    </div>
  )
}

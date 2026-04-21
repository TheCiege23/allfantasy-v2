"use client"

import { useCallback, useEffect, useState } from "react"
import {
  AlertTriangle,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  Wrench,
} from "lucide-react"

type Diagnostics = {
  leagues: number
  users: number
  notificationsUnread: number
  draftSessionsActive: number
  waiverRuns24h: number
  generatedAt: string
}

type InspectData = Record<string, unknown>

type SupportEntry = {
  id: string
  adminUserId: string
  action: string
  targetType: string | null
  targetId: string | null
  details: unknown
  createdAt: string
}

export default function AdminOperationsPanel() {
  const [diag, setDiag] = useState<Diagnostics | null>(null)
  const [diagLoading, setDiagLoading] = useState(false)
  const [q, setQ] = useState("")
  const [searchRows, setSearchRows] = useState<
    Array<{ id: string; name: string | null; sport: string; season: number; platform: string }>
  >([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [leagueId, setLeagueId] = useState("")
  const [inspect, setInspect] = useState<InspectData | null>(null)
  const [inspectLoading, setInspectLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [supportNotes, setSupportNotes] = useState<SupportEntry[]>([])

  const [lifecycleNext, setLifecycleNext] = useState("in_season")
  const [scoringSeason, setScoringSeason] = useState(String(new Date().getUTCFullYear()))
  const [scoringWeek, setScoringWeek] = useState("1")
  const [statSeason, setStatSeason] = useState(String(new Date().getUTCFullYear()))
  const [statWeek, setStatWeek] = useState("1")

  const [noteBody, setNoteBody] = useState("")
  const [noteCaseRef, setNoteCaseRef] = useState("")
  const [noteLeagueId, setNoteLeagueId] = useState("")
  const [noteUserId, setNoteUserId] = useState("")

  const [riskUserId, setRiskUserId] = useState("")
  const [riskSignal, setRiskSignal] = useState("")
  const [riskSeverity, setRiskSeverity] = useState<"low" | "medium" | "high">("medium")

  const [disputeKey, setDisputeKey] = useState("")
  const [disputeStatus, setDisputeStatus] = useState("")
  const [disputeNotes, setDisputeNotes] = useState("")

  const loadDiag = useCallback(async () => {
    setDiagLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/operations/diagnostics", { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Diagnostics failed")
      setDiag(json.data as Diagnostics)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Diagnostics error")
    } finally {
      setDiagLoading(false)
    }
  }, [])

  const loadSupport = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/operations/support-notes?limit=60", { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (res.ok) setSupportNotes((json.data as SupportEntry[]) ?? [])
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    void loadDiag()
    void loadSupport()
  }, [loadDiag, loadSupport])

  const runSearch = async () => {
    if (!q.trim()) {
      setSearchRows([])
      return
    }
    setSearchLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `/api/admin/operations/leagues/search?q=${encodeURIComponent(q.trim())}`,
        { cache: "no-store" },
      )
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Search failed")
      setSearchRows(json.data ?? [])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Search error")
    } finally {
      setSearchLoading(false)
    }
  }

  const runInspect = async (id: string) => {
    const lid = id.trim()
    if (!lid) return
    setLeagueId(lid)
    setInspectLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/operations/leagues/${encodeURIComponent(lid)}/inspect`, {
        cache: "no-store",
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Inspect failed")
      setInspect(json.data as InspectData)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Inspect error")
      setInspect(null)
    } finally {
      setInspectLoading(false)
    }
  }

  const postAction = async (body: Record<string, unknown>) => {
    const lid = leagueId.trim()
    if (!lid) {
      setError("Set a league id (search or paste) first.")
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/operations/leagues/${encodeURIComponent(lid)}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Action failed")
      await runInspect(lid)
      await loadSupport()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action error")
    } finally {
      setBusy(false)
    }
  }

  const submitNote = async () => {
    if (!noteBody.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/operations/support-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: noteBody,
          caseRef: noteCaseRef || undefined,
          leagueId: noteLeagueId || undefined,
          userId: noteUserId || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed to save note")
      setNoteBody("")
      await loadSupport()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Note error")
    } finally {
      setBusy(false)
    }
  }

  const submitRisk = async () => {
    if (!riskUserId.trim() || !riskSignal.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/operations/risk-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: riskUserId.trim(),
          signal: riskSignal.trim(),
          severity: riskSeverity,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed")
      setRiskSignal("")
      await loadSupport()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Risk error")
    } finally {
      setBusy(false)
    }
  }

  const submitDispute = async () => {
    if (!disputeKey.trim() || !disputeStatus.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch("/api/admin/operations/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          disputeKey: disputeKey.trim(),
          status: disputeStatus.trim(),
          notes: disputeNotes || undefined,
          leagueId: noteLeagueId || undefined,
          userId: noteUserId || undefined,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json?.error || "Failed")
      setDisputeKey("")
      setDisputeStatus("")
      setDisputeNotes("")
      await loadSupport()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Dispute error")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl shadow-lg"
            style={{
              background:
                "linear-gradient(to bottom right, var(--accent), color-mix(in srgb, var(--accent) 70%, black))",
            }}
          >
            <Stethoscope className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: "var(--text)" }}>
              Operations & support
            </h2>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              League inspect, recovery jobs, finance visibility, support notes, risk & disputes — all audited.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadDiag()}
          disabled={diagLoading}
          className="inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-sm disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          data-testid="admin-ops-refresh-diag"
        >
          <RefreshCw className={`h-4 w-4 ${diagLoading ? "animate-spin" : ""}`} />
          Refresh diagnostics
        </button>
      </div>

      {error ? (
        <div
          className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200"
          data-testid="admin-ops-error"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <section
        className="rounded-2xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        data-testid="admin-ops-diagnostics"
      >
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          <Wrench className="h-4 w-4" />
          Platform diagnostics (read-only)
        </h3>
        {diagLoading && !diag ? (
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--muted)" }} />
        ) : diag ? (
          <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3" style={{ color: "var(--muted)" }}>
            <div>
              Leagues: <span style={{ color: "var(--text)" }}>{diag.leagues}</span>
            </div>
            <div>
              Users: <span style={{ color: "var(--text)" }}>{diag.users}</span>
            </div>
            <div>
              Unread notifications: <span style={{ color: "var(--text)" }}>{diag.notificationsUnread}</span>
            </div>
            <div>
              Active draft sessions: <span style={{ color: "var(--text)" }}>{diag.draftSessionsActive}</span>
            </div>
            <div>
              Waiver runs (24h): <span style={{ color: "var(--text)" }}>{diag.waiverRuns24h}</span>
            </div>
            <div className="text-xs opacity-70">Updated {new Date(diag.generatedAt).toLocaleString()}</div>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No data
          </p>
        )}
      </section>

      <section
        className="rounded-2xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          <Search className="h-4 w-4" />
          Search leagues
        </h3>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void runSearch()}
            placeholder="Name, platform id, or league id"
            className="min-w-0 flex-1 rounded-xl border px-3 py-2 text-sm"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--text) 5%, transparent)",
              color: "var(--text)",
            }}
            data-testid="admin-ops-search-input"
          />
          <button
            type="button"
            onClick={() => void runSearch()}
            disabled={searchLoading}
            className="rounded-xl border px-4 py-2 text-sm font-medium disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
            data-testid="admin-ops-search"
          >
            {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </button>
        </div>
        {searchRows.length > 0 ? (
          <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
            {searchRows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  className="w-full rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
                  style={{ color: "var(--text)" }}
                  onClick={() => void runInspect(r.id)}
                  data-testid={`admin-ops-search-row-${r.id}`}
                >
                  <span className="font-mono text-xs">{r.id}</span>{" "}
                  <span className="text-white/80">{r.name ?? "(unnamed)"}</span>{" "}
                  <span className="text-white/50">
                    {r.sport} · {r.season} · {r.platform}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <label className="mt-3 block text-xs" style={{ color: "var(--muted)" }}>
          Focus league id
          <input
            value={leagueId}
            onChange={(e) => setLeagueId(e.target.value)}
            className="mt-1 w-full rounded-lg border px-2 py-1.5 font-mono text-xs"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--text) 5%, transparent)",
              color: "var(--text)",
            }}
            data-testid="admin-ops-league-id"
          />
        </label>
        <button
          type="button"
          onClick={() => void runInspect(leagueId)}
          disabled={inspectLoading || !leagueId.trim()}
          className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
          data-testid="admin-ops-inspect"
        >
          {inspectLoading ? "Loading…" : "Load inspect snapshot"}
        </button>
      </section>

      {inspect ? (
        <section
          className="rounded-2xl border p-4"
          style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          data-testid="admin-ops-inspect-json"
        >
          <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
            Inspect snapshot (draft / waiver / finance / audits)
          </h3>
          <pre
            className="max-h-[420px] overflow-auto rounded-lg p-3 text-[11px] leading-relaxed"
            style={{
              background: "color-mix(in srgb, var(--text) 4%, transparent)",
              color: "var(--muted)",
            }}
          >
            {JSON.stringify(inspect, null, 2)}
          </pre>
        </section>
      ) : null}

      <section
        className="rounded-2xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
        data-testid="admin-ops-recovery"
      >
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          <ShieldAlert className="h-4 w-4 text-amber-400/90" />
          Recovery (privileged — audited)
        </h3>
        <p className="mb-3 text-xs" style={{ color: "var(--muted)" }}>
          Requires a focused league id above. Queues use Redis when configured; stat reprocess runs inline with a unique
          idempotency key.
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            value={lifecycleNext}
            onChange={(e) => setLifecycleNext(e.target.value)}
            className="rounded-lg border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            {[
              "setup",
              "pre_draft",
              "drafting",
              "post_draft",
              "in_season",
              "playoffs",
              "completed",
              "archived",
            ].map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void postAction({
                type: "lifecycle_transition",
                nextState: lifecycleNext,
                force: true,
              })
            }
            className="rounded-lg border border-amber-500/30 px-2 py-1.5 text-xs text-amber-100 disabled:opacity-50"
          >
            Repair lifecycle (force)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void postAction({ type: "enqueue_waiver_process" })}
            className="rounded-lg border px-2 py-1.5 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Enqueue waiver process
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void postAction({
                type: "enqueue_scoring_week",
                season: parseInt(scoringSeason, 10),
                weekOrRound: parseInt(scoringWeek, 10),
              })
            }
            className="rounded-lg border px-2 py-1.5 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Enqueue scoring week
          </button>
          <span className="text-xs opacity-70">season</span>
          <input
            value={scoringSeason}
            onChange={(e) => setScoringSeason(e.target.value)}
            className="w-16 rounded border px-1 py-0.5 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <span className="text-xs opacity-70">week</span>
          <input
            value={scoringWeek}
            onChange={(e) => setScoringWeek(e.target.value)}
            className="w-14 rounded border px-1 py-0.5 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void postAction({
                type: "enqueue_specialty_automation",
                season: parseInt(scoringSeason, 10),
                week: parseInt(scoringWeek, 10),
                trigger: "onScheduledPass",
              })
            }
            className="rounded-lg border px-2 py-1.5 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Rerun specialty automation (force)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void postAction({
                type: "stat_correction_sync",
                season: parseInt(statSeason, 10),
                week: parseInt(statWeek, 10),
              })
            }
            className="rounded-lg border px-2 py-1.5 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Stat reprocess week
          </button>
          <input
            value={statSeason}
            onChange={(e) => setStatSeason(e.target.value)}
            className="w-16 rounded border px-1 py-0.5 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <input
            value={statWeek}
            onChange={(e) => setStatWeek(e.target.value)}
            className="w-14 rounded border px-1 py-0.5 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void postAction({ type: "draft_pause", confirm: true })}
            className="rounded-lg border border-red-500/30 px-2 py-1.5 text-xs text-red-200 disabled:opacity-50"
          >
            Pause draft (emergency)
          </button>
        </div>
      </section>

      <section
        className="rounded-2xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          Support notes & internal refs
        </h3>
        <textarea
          value={noteBody}
          onChange={(e) => setNoteBody(e.target.value)}
          rows={3}
          placeholder="Note (Zendesk / Linear id in case ref)"
          className="w-full rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in srgb, var(--text) 5%, transparent)",
            color: "var(--text)",
          }}
          data-testid="admin-ops-note-body"
        />
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <input
            value={noteCaseRef}
            onChange={(e) => setNoteCaseRef(e.target.value)}
            placeholder="Case ref"
            className="rounded-lg border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <input
            value={noteLeagueId}
            onChange={(e) => setNoteLeagueId(e.target.value)}
            placeholder="League id (optional)"
            className="rounded-lg border px-2 py-1.5 font-mono text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <input
            value={noteUserId}
            onChange={(e) => setNoteUserId(e.target.value)}
            placeholder="User id (optional)"
            className="rounded-lg border px-2 py-1.5 font-mono text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
        </div>
        <button
          type="button"
          disabled={busy || !noteBody.trim()}
          onClick={() => void submitNote()}
          className="mt-2 rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
          data-testid="admin-ops-note-submit"
        >
          Save support note
        </button>
      </section>

      <section
        className="rounded-2xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          Fraud / risk signal
        </h3>
        <div className="flex flex-wrap gap-2">
          <input
            value={riskUserId}
            onChange={(e) => setRiskUserId(e.target.value)}
            placeholder="user id"
            className="min-w-[200px] flex-1 rounded-lg border px-2 py-1.5 font-mono text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <input
            value={riskSignal}
            onChange={(e) => setRiskSignal(e.target.value)}
            placeholder="signal description"
            className="min-w-[200px] flex-1 rounded-lg border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <select
            value={riskSeverity}
            onChange={(e) => setRiskSeverity(e.target.value as "low" | "medium" | "high")}
            className="rounded-lg border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            <option value="low">low</option>
            <option value="medium">medium</option>
            <option value="high">high</option>
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitRisk()}
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Record risk review
          </button>
        </div>
      </section>

      <section
        className="rounded-2xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          Dispute tracking
        </h3>
        <div className="flex flex-wrap gap-2">
          <input
            value={disputeKey}
            onChange={(e) => setDisputeKey(e.target.value)}
            placeholder="dispute key"
            className="min-w-[160px] rounded-lg border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <input
            value={disputeStatus}
            onChange={(e) => setDisputeStatus(e.target.value)}
            placeholder="status"
            className="w-32 rounded-lg border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <input
            value={disputeNotes}
            onChange={(e) => setDisputeNotes(e.target.value)}
            placeholder="notes"
            className="min-w-[200px] flex-1 rounded-lg border px-2 py-1.5 text-xs"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => void submitDispute()}
            className="rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Record dispute update
          </button>
        </div>
      </section>

      <section
        className="rounded-2xl border p-4"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        <h3 className="mb-2 text-sm font-semibold" style={{ color: "var(--text)" }}>
          Recent support / risk / dispute entries
        </h3>
        <ul className="max-h-64 space-y-2 overflow-y-auto text-xs" style={{ color: "var(--muted)" }}>
          {supportNotes.map((e) => (
            <li
              key={e.id}
              className="rounded-lg border border-white/5 p-2"
              style={{ color: "var(--text)" }}
            >
              <div className="font-mono text-[10px] opacity-60">
                {e.action} · {new Date(e.createdAt).toLocaleString()}
              </div>
              <pre className="mt-1 whitespace-pre-wrap break-words text-[11px]" style={{ color: "var(--muted)" }}>
                {JSON.stringify(e.details, null, 0)}
              </pre>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

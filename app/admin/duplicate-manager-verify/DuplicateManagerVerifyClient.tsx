"use client"

import { useState } from "react"

type Preflight = {
  testLeagueName: string
  testEmailDomain: string
  operations: string[]
  existingLeagueCount: number
  existingUserCount: number
  safeToExecute: boolean
}

type ExecuteResult = {
  ok: boolean
  assertions: Record<string, unknown>
  error?: string
  cleanup: {
    attempted: boolean
    failedSteps: string[]
    finalLeagueCount: number
    finalUserCount: number
    remainingManifest?: unknown
  }
}

export default function DuplicateManagerVerifyClient() {
  const [preflight, setPreflight] = useState<Preflight | null>(null)
  const [dryRunError, setDryRunError] = useState<string | null>(null)
  const [dryRunLoading, setDryRunLoading] = useState(false)

  const [confirmText, setConfirmText] = useState("")
  const [executeLoading, setExecuteLoading] = useState(false)
  const [executeResult, setExecuteResult] = useState<ExecuteResult | null>(null)
  const [executeError, setExecuteError] = useState<string | null>(null)

  async function runDryRun() {
    setDryRunLoading(true)
    setDryRunError(null)
    setExecuteResult(null)
    try {
      const res = await fetch("/api/admin/duplicate-manager-verify", { method: "GET", cache: "no-store" })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.ok) {
        setDryRunError(body?.error || "Dry-run failed.")
        return
      }
      setPreflight(body.preflight)
    } catch {
      setDryRunError("Dry-run failed — check your connection and try again.")
    } finally {
      setDryRunLoading(false)
    }
  }

  async function runExecute() {
    if (!preflight || confirmText !== preflight.testLeagueName) return
    setExecuteLoading(true)
    setExecuteError(null)
    try {
      const res = await fetch("/api/admin/duplicate-manager-verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmLeagueName: confirmText }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setExecuteError(body?.error || "Execute failed.")
        return
      }
      setExecuteResult(body.result)
      setConfirmText("")
      // Preflight is now stale (rows were created and deleted) — refresh it.
      void runDryRun()
    } catch {
      setExecuteError("Execute failed — check your connection and try again.")
    } finally {
      setExecuteLoading(false)
    }
  }

  const canExecute = Boolean(preflight?.safeToExecute) && confirmText === preflight?.testLeagueName

  return (
    <div className="mt-6 space-y-5">
      <section className="rounded-3xl border border-cyan-300/15 bg-black/45 p-6 shadow-[0_28px_90px_-54px_rgba(34,211,238,0.85)] backdrop-blur-xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-black uppercase tracking-[0.18em] text-cyan-100/80">1. Dry run (read-only)</h2>
          <button
            type="button"
            onClick={() => void runDryRun()}
            disabled={dryRunLoading}
            className="min-h-11 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_48px_-28px_rgba(34,211,238,0.9)] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {dryRunLoading ? "Checking…" : "Run dry-run"}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-white/50">
          Creates and deletes nothing — only confirms the test markers, the planned operations, and that no
          existing rows already match those markers.
        </p>

        {dryRunError ? (
          <p className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-300/[0.08] px-4 py-3 text-sm font-bold text-rose-100">{dryRunError}</p>
        ) : null}

        {preflight ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-xs leading-5 text-white/65">
              <p><span className="font-black text-white">Test league name:</span> {preflight.testLeagueName}</p>
              <p><span className="font-black text-white">Test email domain:</span> {preflight.testEmailDomain}</p>
              <p className="mt-2">
                Existing rows matching markers — leagues: <span className="font-black text-white">{preflight.existingLeagueCount}</span>,
                {" "}users: <span className="font-black text-white">{preflight.existingUserCount}</span>
              </p>
              <p className={`mt-2 font-black ${preflight.safeToExecute ? "text-emerald-300" : "text-rose-300"}`}>
                {preflight.safeToExecute ? "Safe to execute." : "NOT safe — leftover rows exist. Investigate before executing."}
              </p>
            </div>
            <details className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-white/55">
              <summary className="cursor-pointer font-black text-white/80">Planned operations</summary>
              <ol className="mt-3 list-decimal space-y-1 pl-5">
                {preflight.operations.map((op) => <li key={op}>{op}</li>)}
              </ol>
            </details>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-amber-300/20 bg-black/45 p-6 shadow-[0_28px_90px_-54px_rgba(251,191,36,0.55)] backdrop-blur-xl">
        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-amber-100/80">2. Execute (writes + deletes real rows)</h2>
        <p className="mt-2 text-xs leading-5 text-white/50">
          Run the dry-run first. To confirm, type the exact test league name shown above.
        </p>
        <label className="mt-4 block">
          <span className="text-xs font-black uppercase tracking-[0.14em] text-amber-100/60">Type the test league name to confirm</span>
          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            disabled={!preflight}
            placeholder={preflight?.testLeagueName ?? "Run the dry-run first"}
            className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/30 focus:border-amber-300/65 disabled:cursor-not-allowed disabled:opacity-50"
          />
        </label>
        <button
          type="button"
          onClick={() => void runExecute()}
          disabled={!canExecute || executeLoading}
          className="mt-4 min-h-12 w-full rounded-2xl bg-amber-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_48px_-28px_rgba(251,191,36,0.9)] transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {executeLoading ? "Running full verification…" : "Run execute"}
        </button>

        {executeError ? (
          <p className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-300/[0.08] px-4 py-3 text-sm font-bold text-rose-100">{executeError}</p>
        ) : null}

        {executeResult ? (
          <div className="mt-4 space-y-3">
            <p className={`rounded-2xl border px-4 py-3 text-sm font-black ${executeResult.ok ? "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-100" : "border-rose-300/25 bg-rose-300/[0.08] text-rose-100"}`}>
              {executeResult.ok ? "All assertions passed and cleanup completed — zero test rows remain." : "Verification failed or cleanup was incomplete — see details below."}
            </p>
            {executeResult.error ? (
              <p className="rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] px-4 py-3 text-xs font-mono text-rose-100/90">{executeResult.error}</p>
            ) : null}
            {executeResult.cleanup.failedSteps.length > 0 ? (
              <div className="rounded-2xl border border-rose-300/25 bg-rose-300/[0.08] p-4 text-xs leading-5 text-rose-100">
                <p className="font-black">Cleanup steps that failed: {executeResult.cleanup.failedSteps.join(", ")}</p>
                <p className="mt-2">Remaining IDs must be resolved manually — see the raw result below.</p>
              </div>
            ) : null}
            <details className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-xs leading-5 text-white/55">
              <summary className="cursor-pointer font-black text-white/80">Full result (assertions + cleanup)</summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] text-cyan-100/80">
                {JSON.stringify(executeResult, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </section>
    </div>
  )
}

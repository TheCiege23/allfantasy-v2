"use client"

import { FormEvent, useState } from "react"

export default function AdminBootstrapClient() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [status, setStatus] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setStatus(null)

    try {
      const res = await fetch("/api/admin/bootstrap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body?.ok) {
        setStatus(body?.error || "Bootstrap failed. Check the Vercel admin bootstrap env vars.")
        return
      }
      setStatus("Admin session created. Opening the command center...")
      window.location.assign(body.next || "/admin")
    } catch {
      setStatus("Bootstrap failed. Check your connection and try again.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/65">
          Bootstrap email
        </span>
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          type="email"
          autoComplete="email"
          required
          className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-cyan-300/65"
          placeholder="founder@example.com"
        />
      </label>
      <label className="block">
        <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-100/65">
          Bootstrap password
        </span>
        <input
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          type="password"
          autoComplete="current-password"
          required
          className="mt-2 min-h-12 w-full rounded-2xl border border-white/10 bg-black/35 px-4 text-sm font-semibold text-white outline-none placeholder:text-white/35 focus:border-cyan-300/65"
          placeholder="Configured in Vercel"
        />
      </label>
      <button
        type="submit"
        disabled={submitting}
        className="min-h-12 w-full rounded-2xl bg-cyan-300 px-5 text-sm font-black text-slate-950 shadow-[0_18px_48px_-28px_rgba(34,211,238,0.9)] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? "Creating admin session..." : "Bootstrap admin access"}
      </button>
      {status ? (
        <p className="rounded-2xl border border-amber-300/20 bg-amber-300/[0.08] px-4 py-3 text-sm font-bold text-amber-100">
          {status}
        </p>
      ) : null}
    </form>
  )
}

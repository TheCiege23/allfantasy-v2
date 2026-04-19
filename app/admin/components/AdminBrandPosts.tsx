"use client"

import { useCallback, useEffect, useState } from "react"
import {
  Loader2,
  Megaphone,
  RefreshCw,
  Sparkles,
  Copy,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import {
  BRAND_PLATFORMS,
  PLATFORM_CHAR_LIMITS,
  PLATFORM_LABELS,
  type BrandDraftVariant,
  type BrandPlatform,
  type BrandPostStatus,
} from "@/lib/brand-social/types"

type Post = {
  id: string
  accountId: string
  status: BrandPostStatus
  body: string
  mediaUrl: string | null
  scheduledFor: string | null
  publishedAt: string | null
  providerPostId: string | null
  failureMessage: string | null
  aiModel: string | null
  createdByEmail: string
  createdAt: string
  updatedAt: string
  account: {
    platform: string
    handle: string
    displayName: string | null
  }
}

type DraftResponse = {
  ok: true
  platform: BrandPlatform
  model: string
  variants: BrandDraftVariant[]
}

const TONES = [
  { id: "neutral", label: "Neutral" },
  { id: "hype", label: "Hype" },
  { id: "analytical", label: "Analytical" },
  { id: "playful", label: "Playful" },
] as const

type Tone = (typeof TONES)[number]["id"]

export default function AdminBrandPosts() {
  const [platform, setPlatform] = useState<BrandPlatform>("x")
  const [tone, setTone] = useState<Tone>("neutral")
  const [variantsCount, setVariantsCount] = useState(3)
  const [includeHashtags, setIncludeHashtags] = useState(true)
  const [brief, setBrief] = useState("")
  const [drafts, setDrafts] = useState<BrandDraftVariant[]>([])
  const [drafting, setDrafting] = useState(false)
  const [draftError, setDraftError] = useState<string | null>(null)
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const [posts, setPosts] = useState<Post[]>([])
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [postsError, setPostsError] = useState<string | null>(null)

  const loadPosts = useCallback(async () => {
    setLoadingPosts(true)
    setPostsError(null)
    try {
      const res = await fetch("/api/admin/brand-posts?limit=50", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data?.error || "Failed to load posts")
      setPosts(data.posts ?? [])
    } catch (e: any) {
      setPostsError(e?.message || "Failed to load posts")
    } finally {
      setLoadingPosts(false)
    }
  }, [])

  useEffect(() => {
    void loadPosts()
  }, [loadPosts])

  async function runDraft(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!brief.trim()) {
      setDraftError("Describe what you want to post about.")
      return
    }
    setDrafting(true)
    setDraftError(null)
    setDrafts([])
    try {
      const res = await fetch("/api/admin/brand-posts/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          tone,
          brief: brief.trim(),
          variants: variantsCount,
          includeHashtags,
        }),
      })
      const data = (await res.json()) as DraftResponse | { ok?: false; error?: string }
      if (!res.ok || !("ok" in data) || data.ok !== true) {
        throw new Error(("error" in data && data.error) || "Draft failed")
      }
      setDrafts(data.variants)
    } catch (e: any) {
      setDraftError(e?.message || "Draft failed")
    } finally {
      setDrafting(false)
    }
  }

  async function copyVariant(i: number) {
    const v = drafts[i]
    if (!v) return
    const text = [v.body, v.hashtags.length > 0 ? v.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ") : ""]
      .filter(Boolean)
      .join("\n\n")
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(i)
      setTimeout(() => setCopiedIndex((c) => (c === i ? null : c)), 1500)
    } catch {
      /* clipboard blocked — no-op */
    }
  }

  const charLimit = PLATFORM_CHAR_LIMITS[platform]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold sm:text-2xl" style={{ color: "var(--text)" }}>
            <Megaphone className="h-5 w-5 text-violet-400" />
            Content
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Draft brand posts with AI → review → publish to your social accounts. Brand accounts are managed
            separately from user accounts; connecting new accounts and publishing ship in the next phase.
          </p>
        </div>
        <button
          type="button"
          onClick={loadPosts}
          disabled={loadingPosts}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
        >
          {loadingPosts ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {/* Compose — AI draft */}
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 3%, transparent)" }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            AI compose
          </h2>
          <span className="text-[11px]" style={{ color: "var(--muted)" }}>
            Claude drafts {variantsCount} platform-aware variants — pick one to refine
          </span>
        </div>

        <form onSubmit={runDraft} className="space-y-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Platform
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as BrandPlatform)}
                disabled={drafting}
                className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                {BRAND_PLATFORMS.map((p) => (
                  <option key={p} value={p}>
                    {PLATFORM_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Tone
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as Tone)}
                disabled={drafting}
                className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                {TONES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Variants
              <select
                value={variantsCount}
                onChange={(e) => setVariantsCount(Number(e.target.value))}
                disabled={drafting}
                className="mt-1 w-full rounded-lg border px-2 py-2 text-sm"
                style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <label
              className="flex items-end gap-2 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--muted)" }}
            >
              <input
                type="checkbox"
                checked={includeHashtags}
                onChange={(e) => setIncludeHashtags(e.target.checked)}
                disabled={drafting}
                className="h-3.5 w-3.5"
              />
              Include hashtags
            </label>
          </div>

          <label className="block text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
            Brief
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              disabled={drafting}
              placeholder="What's this post about? e.g. Announce the new Trade Value console with live FantasyCalc pricing + league-scored projections."
              rows={3}
              maxLength={2000}
              className="mt-1 w-full resize-none rounded-lg border px-2 py-2 text-sm"
              style={{ background: "var(--surface, #121725)", borderColor: "var(--border)", color: "var(--text)" }}
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={drafting || !brief.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 disabled:opacity-60"
            >
              {drafting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Drafting…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" /> Draft {variantsCount} variant{variantsCount === 1 ? "" : "s"}
                </>
              )}
            </button>
            <span className="text-[11px]" style={{ color: "var(--muted)" }}>
              {PLATFORM_LABELS[platform]} limit: {charLimit.toLocaleString()} chars
            </span>
          </div>

          {draftError ? (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{draftError}</span>
            </div>
          ) : null}
        </form>

        {drafts.length > 0 ? (
          <div className="mt-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
              Variants
            </p>
            {drafts.map((v, i) => (
              <div
                key={i}
                className="rounded-lg border px-3 py-2.5"
                style={{
                  borderColor: v.withinLimit ? "var(--border)" : "#f87171",
                  background: "color-mix(in srgb, var(--text) 2%, transparent)",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: "var(--text)" }}>
                    {v.body}
                  </p>
                  <button
                    type="button"
                    onClick={() => copyVariant(i)}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold"
                    style={{ borderColor: "var(--border)", color: "var(--muted)" }}
                    title="Copy body + hashtags"
                  >
                    {copiedIndex === i ? <CheckCircle2 className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    {copiedIndex === i ? "Copied" : "Copy"}
                  </button>
                </div>
                {v.hashtags.length > 0 ? (
                  <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                    {v.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
                  </p>
                ) : null}
                <p
                  className="mt-1 text-[10px] font-semibold"
                  style={{ color: v.withinLimit ? "var(--muted)" : "#f87171" }}
                >
                  {v.charCount} / {charLimit} chars {v.withinLimit ? "" : "— over limit"}
                </p>
              </div>
            ))}
            <p className="text-[10px]" style={{ color: "var(--muted)" }}>
              Save / publish / schedule flow ships in the next phase — for now, copy the best variant and post manually.
            </p>
          </div>
        ) : null}
      </div>

      {/* Posts history placeholder */}
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--text) 3%, transparent)" }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4 text-sky-400" />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Posts
          </h2>
        </div>
        {postsError ? (
          <p className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[11px] text-rose-200">
            {postsError}
          </p>
        ) : null}
        {loadingPosts && posts.length === 0 ? (
          <div className="flex items-center justify-center py-6" style={{ color: "var(--muted)" }}>
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            No posts yet. Drafts and scheduled sends will land here once publish is wired.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ background: "color-mix(in srgb, var(--text) 5%, transparent)" }}>
                  <th className="px-3 py-2 text-left" style={{ color: "var(--muted)" }}>Status</th>
                  <th className="px-3 py-2 text-left" style={{ color: "var(--muted)" }}>Account</th>
                  <th className="px-3 py-2 text-left" style={{ color: "var(--muted)" }}>Body</th>
                  <th className="px-3 py-2 text-left" style={{ color: "var(--muted)" }}>Scheduled / Sent</th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p) => (
                  <tr key={p.id} className="border-t" style={{ borderColor: "var(--border)" }}>
                    <td className="px-3 py-2">
                      <StatusPill status={p.status} />
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--text)" }}>
                      {p.account?.platform ? `${PLATFORM_LABELS[p.account.platform as BrandPlatform] ?? p.account.platform}` : "—"}
                      {" · "}
                      <span style={{ color: "var(--muted)" }}>
                        @{p.account?.handle ?? "unknown"}
                      </span>
                    </td>
                    <td className="max-w-[32ch] truncate px-3 py-2" style={{ color: "var(--text)" }} title={p.body}>
                      {p.body}
                    </td>
                    <td className="px-3 py-2" style={{ color: "var(--muted)" }}>
                      {p.publishedAt
                        ? new Date(p.publishedAt).toLocaleString()
                        : p.scheduledFor
                          ? `→ ${new Date(p.scheduledFor).toLocaleString()}`
                          : "—"}
                      {p.failureMessage ? (
                        <p className="text-[10px] text-rose-300">{p.failureMessage}</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: BrandPostStatus }) {
  const map: Record<BrandPostStatus, { label: string; cls: string; icon: React.ReactNode }> = {
    draft: {
      label: "Draft",
      cls: "bg-white/5 text-white/60 border-white/10",
      icon: <Clock className="h-3 w-3" />,
    },
    scheduled: {
      label: "Scheduled",
      cls: "bg-sky-500/10 text-sky-200 border-sky-500/30",
      icon: <Clock className="h-3 w-3" />,
    },
    publishing: {
      label: "Publishing",
      cls: "bg-amber-500/10 text-amber-100 border-amber-500/30",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
    },
    sent: {
      label: "Sent",
      cls: "bg-emerald-500/10 text-emerald-200 border-emerald-500/30",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    failed: {
      label: "Failed",
      cls: "bg-rose-500/10 text-rose-200 border-rose-500/30",
      icon: <XCircle className="h-3 w-3" />,
    },
    cancelled: {
      label: "Cancelled",
      cls: "bg-white/5 text-white/40 border-white/10",
      icon: <XCircle className="h-3 w-3" />,
    },
  }
  const m = map[status] ?? map.draft
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${m.cls}`}
    >
      {m.icon}
      {m.label}
    </span>
  )
}

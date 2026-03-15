"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search, X, ChevronRight } from "lucide-react"
import {
  getUniversalSearchPayload,
  getGroupedStaticResults,
  getCommandPaletteShortcut,
  createCommandPaletteHandler,
} from "@/lib/search"
import type { QuickActionItem } from "@/lib/search"
import type { SearchResultItem } from "@/lib/search"

export interface SearchOverlayProps {
  open: boolean
  onClose: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  quick_action: "Quick actions",
  tool: "Tools",
  page: "Pages",
  league: "Leagues",
  player: "Players",
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const payload = useMemo(() => getUniversalSearchPayload(query), [query])
  const grouped = useMemo(
    () => (payload.staticResults.length > 0 ? getGroupedStaticResults(payload.staticResults) : null),
    [payload.staticResults]
  )

  const flatItems = useMemo(() => {
    const list: { type: "quick" | "static"; item: QuickActionItem | SearchResultItem; id: string }[] = []
    if (payload.quickActions.length) {
      payload.quickActions.forEach((a) => list.push({ type: "quick", item: a, id: a.id }))
    }
    if (grouped) {
      for (const [, items] of grouped) {
        ;(items as SearchResultItem[]).forEach((r) => list.push({ type: "static", item: r, id: r.id }))
      }
    }
    return list
  }, [payload.quickActions, grouped])

  const navigate = useCallback(
    (href: string) => {
      onClose()
      setQuery("")
      setHighlight(0)
      router.push(href)
    },
    [onClose, router]
  )

  useEffect(() => {
    if (!open) return
    setQuery("")
    setHighlight(0)
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    setHighlight(0)
  }, [query])

  useEffect(() => {
    if (highlight >= flatItems.length && flatItems.length > 0) setHighlight(flatItems.length - 1)
  }, [flatItems.length, highlight])

  useEffect(() => {
    const handler = createCommandPaletteHandler(() => inputRef.current?.focus())
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setHighlight((i) => (i < flatItems.length - 1 ? i + 1 : 0))
        return
      }
      if (e.key === "ArrowUp") {
        e.preventDefault()
        setHighlight((i) => (i > 0 ? i - 1 : flatItems.length - 1))
        return
      }
      if (e.key === "Enter" && flatItems[highlight]) {
        e.preventDefault()
        const entry = flatItems[highlight]
        const href = entry.item.href
        navigate(href)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, flatItems, highlight, navigate, onClose])

  useEffect(() => {
    if (highlight < 0 || !listRef.current) return
    const el = listRef.current.querySelector(`[data-highlight-index="${highlight}"]`)
    el?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [highlight])

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      <div
        className="fixed left-1/2 top-[15%] z-[101] w-[min(100vw-2rem,520px)] -translate-x-1/2 rounded-2xl border shadow-2xl"
        style={{
          background: "var(--panel)",
          borderColor: "var(--border)",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
          <Search className="h-5 w-5 shrink-0" style={{ color: "var(--muted)" }} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, tools, or quick actions..."
            className="flex-1 bg-transparent py-2 text-sm outline-none"
            style={{ color: "var(--text)" }}
            autoComplete="off"
          />
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition hover:bg-white/10"
            style={{ color: "var(--muted)" }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2" ref={listRef}>
          {flatItems.length === 0 && query.length >= 2 && (
            <p className="px-3 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              No results for &quot;{query}&quot;
            </p>
          )}
          {flatItems.length === 0 && query.length < 2 && (
            <p className="px-3 py-6 text-center text-sm" style={{ color: "var(--muted)" }}>
              Type to search. Press {getCommandPaletteShortcut()} to focus.
            </p>
          )}
          {payload.quickActions.length > 0 && (
            <section className="mb-2">
              <h3 className="px-2 py-1 text-xs font-medium uppercase" style={{ color: "var(--muted)" }}>
                Quick actions
              </h3>
              <ul className="space-y-0.5">
                {payload.quickActions.map((action) => {
                  const idx = flatItems.findIndex((e) => e.type === "quick" && e.id === action.id)
                  const isHighlight = idx === highlight
                  return (
                    <li key={action.id}>
                      <button
                        type="button"
                        data-highlight-index={idx}
                        onClick={() => navigate(action.href)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition"
                        style={{
                          background: isHighlight ? "color-mix(in srgb, var(--accent-cyan) 15%, transparent)" : "transparent",
                          color: isHighlight ? "var(--accent-cyan-strong)" : "var(--text)",
                        }}
                      >
                        <span className="font-medium">{action.label}</span>
                        {action.description && (
                          <span className="text-xs opacity-80">{action.description}</span>
                        )}
                        <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
          {grouped && (
            <>
              {Array.from(grouped.entries()).map(([cat, items]) => (
                <section key={cat} className="mb-2">
                  <h3 className="px-2 py-1 text-xs font-medium uppercase" style={{ color: "var(--muted)" }}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </h3>
                  <ul className="space-y-0.5">
                    {(items as SearchResultItem[]).map((item) => {
                      const idx = flatItems.findIndex((e) => e.type === "static" && e.id === item.id)
                      const isHighlight = idx === highlight
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            data-highlight-index={idx}
                            onClick={() => navigate(item.href)}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition"
                            style={{
                              background: isHighlight ? "color-mix(in srgb, var(--accent-cyan) 15%, transparent)" : "transparent",
                              color: isHighlight ? "var(--accent-cyan-strong)" : "var(--text)",
                            }}
                          >
                            <span className="font-medium">{item.label}</span>
                            <ChevronRight className="ml-auto h-4 w-4 opacity-50" />
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </section>
              ))}
            </>
          )}
        </div>
        <div className="border-t px-3 py-2 text-xs" style={{ borderColor: "var(--border)", color: "var(--muted)" }}>
          <kbd className="rounded border px-1.5 py-0.5" style={{ borderColor: "var(--border)" }}>{getCommandPaletteShortcut()}</kbd> to open · ↑↓ to move · Enter to go
        </div>
      </div>
    </>
  )
}

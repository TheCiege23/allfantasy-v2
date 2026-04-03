'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'

const RECENT_KEY = 'af-recent-emojis'

type EmojiRow = {
  id: string
  char: string
  name: string
  shortcode: string
  category: string
}

let emojiPayload: {
  emojis: EmojiRow[]
  categories: string[]
  grouped?: Record<string, EmojiRow[]>
} | null = null

const TAB_ICONS: Record<string, string> = {
  smileys_people: '😀',
  sports: '🏈',
  gestures: '👋',
  nature: '🌿',
  food: '🍕',
  objects: '💡',
  symbols: '❤️',
  flags: '🚩',
}

type EmojiPickerProps = {
  onSelect: (char: string) => void
  onClose: () => void
}

function readRecent(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const p = JSON.parse(raw) as unknown
    return Array.isArray(p) ? p.filter((x): x is string => typeof x === 'string').slice(0, 16) : []
  } catch {
    return []
  }
}

function pushRecent(char: string) {
  const prev = readRecent().filter((c) => c !== char)
  prev.unshift(char)
  localStorage.setItem(RECENT_KEY, JSON.stringify(prev.slice(0, 16)))
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(!emojiPayload)
  const [emojis, setEmojis] = useState<EmojiRow[]>(emojiPayload?.emojis ?? [])
  const [categories, setCategories] = useState<string[]>(emojiPayload?.categories ?? [])
  const [grouped, setGrouped] = useState<Record<string, EmojiRow[]> | null>(emojiPayload?.grouped ?? null)
  const [activeCat, setActiveCat] = useState<string | null>(null)
  const [recent, setRecent] = useState<string[]>([])

  useEffect(() => {
    setRecent(readRecent())
  }, [])

  useEffect(() => {
    if (emojiPayload) {
      setEmojis(emojiPayload.emojis)
      setCategories(emojiPayload.categories)
      setGrouped(emojiPayload.grouped ?? null)
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/chat/emojis', { cache: 'force-cache' })
        const data = (await res.json()) as {
          emojis?: EmojiRow[]
          categories?: string[]
          grouped?: Record<string, EmojiRow[]>
        }
        if (cancelled) return
        emojiPayload = {
          emojis: data.emojis ?? [],
          categories: data.categories ?? [],
          grouped: data.grouped,
        }
        setEmojis(emojiPayload.emojis)
        setCategories(emojiPayload.categories)
        setGrouped(emojiPayload.grouped ?? null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (categories.length && !activeCat) setActiveCat(categories[0] ?? null)
  }, [categories, activeCat])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      if (activeCat && grouped?.[activeCat]) return grouped[activeCat]
      return emojis
    }
    return emojis.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.shortcode.toLowerCase().includes(q) ||
        e.char.includes(q)
    )
  }, [search, emojis, grouped, activeCat])

  const pick = useCallback(
    (char: string) => {
      pushRecent(char)
      setRecent(readRecent())
      onSelect(char)
    },
    [onSelect]
  )

  const tabs = categories.length ? categories : Object.keys(grouped ?? {})

  return (
    <div className="mb-2 max-h-72 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c1e] p-3">
      <div className="mb-2 flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2">
        <Search className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emojis..."
          className="min-w-0 flex-1 bg-transparent text-[12px] text-white outline-none placeholder:text-white/35"
        />
        <button type="button" onClick={onClose} className="text-[10px] text-white/40 hover:text-white">
          Done
        </button>
      </div>

      {!search.trim() && recent.length > 0 ? (
        <div className="mb-2">
          <p className="mb-1 text-[9px] uppercase tracking-wide text-white/35">Recent</p>
          <div className="flex flex-wrap gap-1">
            {recent.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => pick(c)}
                className="rounded-lg p-1 text-[22px] hover:bg-white/[0.06]"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {!search.trim() ? (
        <div className="mb-2 flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none]">
          {tabs.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCat(cat)}
              className={`shrink-0 rounded-lg px-2 py-1 text-[16px] transition-colors ${
                activeCat === cat ? 'bg-cyan-500/15 text-cyan-300' : 'text-white/50 hover:bg-white/[0.06]'
              }`}
              title={cat}
            >
              {TAB_ICONS[cat] ?? '•'}
            </button>
          ))}
        </div>
      ) : null}

      <div className="max-h-44 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
        {loading ? (
          <div className="grid grid-cols-8 gap-1">
            {Array.from({ length: 24 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-lg bg-white/[0.06]" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-0.5">
            {filtered.map((e) => (
              <button
                key={e.id}
                type="button"
                title={e.name}
                onClick={() => pick(e.char)}
                className="rounded-lg p-1 text-[22px] transition-colors hover:bg-white/[0.06]"
              >
                {e.char}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

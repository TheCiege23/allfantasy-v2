'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LeagueSport } from '@prisma/client'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import {
  type FavoriteSportsSelection,
  readFavoriteSportsSelection,
  writeFavoriteSportsSelection,
  hasAnyFavoriteSport,
} from '@/lib/dashboard/favorite-sports-storage'

const SPORT_LABELS: Record<LeagueSport, string> = {
  NFL: 'NFL',
  NBA: 'NBA',
  NHL: 'NHL',
  MLB: 'MLB',
  NCAAF: 'NCAA Football',
  NCAAB: 'NCAA Basketball',
  SOCCER: 'Soccer',
}

type FavoriteSportsOnboardingModalProps = {
  open: boolean
  onClose: () => void
  onSaved: (selection: FavoriteSportsSelection) => void
}

export function FavoriteSportsOnboardingModal({ open, onClose, onSaved }: FavoriteSportsOnboardingModalProps) {
  const [supportedSet, setSupportedSet] = useState<Set<LeagueSport>>(new Set())
  const [custom, setCustom] = useState<string[]>([])
  const [customInput, setCustomInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    const sel = readFavoriteSportsSelection()
    setSupportedSet(new Set(sel.supported))
    setCustom(sel.custom)
    setCustomInput('')
    setError(null)
  }, [])

  useEffect(() => {
    if (open) load()
  }, [open, load])

  const toggleSupported = (sport: LeagueSport) => {
    setSupportedSet((prev) => {
      const next = new Set(prev)
      if (next.has(sport)) next.delete(sport)
      else next.add(sport)
      return next
    })
    setError(null)
  }

  const addCustom = () => {
    const raw = customInput.trim()
    if (!raw) return
    if (raw.length > 48) {
      setError('Keep each custom sport under 48 characters.')
      return
    }
    const lower = raw.toLowerCase()
    if (custom.some((c) => c.toLowerCase() === lower)) {
      setCustomInput('')
      return
    }
    if (custom.length >= 24) {
      setError('You can add up to 24 extra sports.')
      return
    }
    setCustom((c) => [...c, raw])
    setCustomInput('')
    setError(null)
  }

  const removeCustom = (idx: number) => {
    setCustom((c) => c.filter((_, i) => i !== idx))
  }

  const selection = useMemo((): FavoriteSportsSelection => {
    return {
      supported: SUPPORTED_SPORTS.filter((s) => supportedSet.has(s)),
      custom: [...custom],
    }
  }, [supportedSet, custom])

  const handleSave = () => {
    if (!hasAnyFavoriteSport(selection)) {
      setError('Pick at least one sport (or add your own below).')
      return
    }
    writeFavoriteSportsSelection(selection)
    onSaved(selection)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="af-fav-sports-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0a1228] shadow-xl">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 id="af-fav-sports-title" className="text-lg font-bold text-white">
            Favorite sports
          </h2>
          <p className="mt-1 text-sm text-white/55">
            Select everything you follow. Add custom sports AllFantasy doesn&apos;t list yet — we&apos;ll use this to tune
            your experience.
          </p>
        </div>

        <div className="space-y-5 px-5 py-4">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">AllFantasy sports</p>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_SPORTS.map((sport) => {
                const on = supportedSet.has(sport)
                return (
                  <button
                    key={sport}
                    type="button"
                    data-testid={`onboarding-sport-${sport}`}
                    onClick={() => toggleSupported(sport)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      on
                        ? 'border-cyan-400/50 bg-cyan-500/20 text-cyan-100'
                        : 'border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/[0.07]'
                    }`}
                  >
                    {SPORT_LABELS[sport]}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Other sports</p>
            <p className="mb-2 text-xs text-white/45">Anything else you play or follow (cricket, rugby, F1, etc.).</p>
            <div className="flex flex-wrap gap-2">
              <input
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustom()
                  }
                }}
                placeholder="Type a sport, press Enter"
                className="min-w-[200px] flex-1 rounded-xl border border-white/12 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35"
              />
              <button
                type="button"
                onClick={addCustom}
                className="rounded-xl border border-white/15 px-3 py-2 text-xs font-semibold text-white/85 hover:bg-white/[0.06]"
              >
                Add
              </button>
            </div>
            {custom.length > 0 ? (
              <ul className="mt-3 flex flex-wrap gap-2">
                {custom.map((c, idx) => (
                  <li
                    key={`${c}-${idx}`}
                    className="inline-flex items-center gap-1 rounded-full border border-white/12 bg-white/[0.05] pl-2.5 pr-1 py-0.5 text-xs text-white/90"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      className="rounded-full px-1.5 py-0.5 text-white/50 hover:bg-white/10 hover:text-white"
                      aria-label={`Remove ${c}`}
                      onClick={() => removeCustom(idx)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {error ? <p className="text-sm text-amber-300/95">{error}</p> : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/12 px-4 py-2 text-sm font-semibold text-white/75 hover:bg-white/[0.05]"
          >
            Cancel
          </button>
          <button
            type="button"
            data-testid="onboarding-sports-save"
            onClick={handleSave}
            className="rounded-xl bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 text-sm font-semibold text-black"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

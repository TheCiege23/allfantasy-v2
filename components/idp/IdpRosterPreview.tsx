'use client'

/**
 * Live preview of IDP roster requirements (offense vs IDP slots). For league setup and settings.
 */

import { useMemo } from 'react'
import { IDP_POSITION_MODE_LABELS, IDP_ROSTER_PRESET_LABELS } from '@/lib/idp'

interface SlotSummary {
  offense: Array<{ slot: string; count: number }>
  idp: Array<{ slot: string; count: number }>
  bench: number
  ir: number
}

interface Props {
  starterSlots?: Record<string, number> | null
  benchSlots?: number
  irSlots?: number
  positionMode?: string
  rosterPreset?: string
}

export function IdpRosterPreview({
  starterSlots,
  benchSlots = 7,
  irSlots = 2,
  positionMode = 'standard',
  rosterPreset = 'standard',
}: Props) {
  const summary = useMemo((): SlotSummary => {
    const offense: Array<{ slot: string; count: number }> = []
    const idp: Array<{ slot: string; count: number }> = []
    if (starterSlots) {
      for (const [k, v] of Object.entries(starterSlots)) {
        if (typeof v !== 'number' || v <= 0) continue
        if (['QB', 'RB', 'WR', 'TE', 'FLEX', 'K', 'DST'].includes(k)) offense.push({ slot: k, count: v })
        else idp.push({ slot: k, count: v })
      }
    }
    return { offense, idp, bench: benchSlots, ir: irSlots }
  }, [starterSlots, benchSlots, irSlots])

  const idpTotal = summary.idp.reduce((s, x) => s + x.count, 0)
  const offenseTotal = summary.offense.reduce((s, x) => s + x.count, 0)

  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3 text-sm">
      <div className="mb-2 font-medium text-white">Roster requirements</div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <div className="text-xs text-white/50">Offense</div>
          <div className="flex flex-wrap gap-1">
            {summary.offense.map(({ slot, count }) => (
              <span key={slot} className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-emerald-200">
                {slot}×{count}
              </span>
            ))}
            {summary.offense.length === 0 && <span className="text-white/50">—</span>}
          </div>
          <div className="mt-1 text-xs text-white/50">{offenseTotal} starter slots</div>
        </div>
        <div>
          <div className="text-xs text-white/50">IDP</div>
          <div className="flex flex-wrap gap-1">
            {summary.idp.map(({ slot, count }) => (
              <span key={slot} className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-cyan-200">
                {slot}×{count}
              </span>
            ))}
            {summary.idp.length === 0 && <span className="text-white/50">—</span>}
          </div>
          <div className="mt-1 text-xs text-white/50">{idpTotal} IDP starter slots</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/60">
        <span>Bench: {summary.bench}</span>
        <span>IR: {summary.ir}</span>
        <span>{IDP_POSITION_MODE_LABELS[positionMode] ?? positionMode}</span>
        <span>{IDP_ROSTER_PRESET_LABELS[rosterPreset] ?? rosterPreset}</span>
      </div>
    </div>
  )
}

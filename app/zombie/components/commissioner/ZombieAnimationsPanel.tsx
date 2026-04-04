'use client'

import { useEffect, useState } from 'react'

const KEY = (leagueId: string) => `zombie-anim-prefs:${leagueId}`

const EVENTS = [
  'zombie_turn',
  'player_revived',
  'bashing',
  'mauling',
  'weapon_acquired',
  'weapon_stolen',
  'bomb_detonated',
  'serum_used',
  'ambush_triggered',
  'whisperer_replaced',
  'horde_grows',
  'last_survivor',
] as const

export function ZombieAnimationsPanel({ leagueId, canEdit }: { leagueId: string; canEdit: boolean }) {
  const [enabled, setEnabled] = useState(true)
  const [dramatic, setDramatic] = useState(true)
  const [reducedAll, setReducedAll] = useState(false)
  const [speed, setSpeed] = useState(1000)
  const [eventOn, setEventOn] = useState<Record<string, boolean>>({})
  const [preview, setPreview] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY(leagueId))
      if (!raw) return
      const j = JSON.parse(raw) as Record<string, unknown>
      if (typeof j.enabled === 'boolean') setEnabled(j.enabled)
      if (typeof j.dramatic === 'boolean') setDramatic(j.dramatic)
      if (typeof j.reducedAll === 'boolean') setReducedAll(j.reducedAll)
      if (typeof j.speed === 'number') setSpeed(j.speed)
      if (j.eventOn && typeof j.eventOn === 'object') setEventOn(j.eventOn as Record<string, boolean>)
    } catch {
      /* ignore */
    }
  }, [leagueId])

  function persist(next: {
    enabled?: boolean
    dramatic?: boolean
    reducedAll?: boolean
    speed?: number
    eventOn?: Record<string, boolean>
  }) {
    const payload = {
      enabled: next.enabled ?? enabled,
      dramatic: next.dramatic ?? dramatic,
      reducedAll: next.reducedAll ?? reducedAll,
      speed: next.speed ?? speed,
      eventOn: next.eventOn ?? eventOn,
    }
    try {
      sessionStorage.setItem(KEY(leagueId), JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6 px-4 py-4 md:px-6">
      <p className="text-[12px] text-white/50">
        Stored in this browser until server sync is enabled. Client animations use CSS classes in{' '}
        <code className="text-sky-300/90">globals.css</code>.
      </p>

      <section className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <h3 className="text-[13px] font-bold text-white">Animation modes</h3>
        <label className="flex min-h-[44px] items-center justify-between gap-3 text-[13px] text-white/80">
          Enable animations
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={enabled}
            onChange={(e) => {
              setEnabled(e.target.checked)
              persist({ enabled: e.target.checked })
            }}
            className="h-5 w-5"
          />
        </label>
        <label className="flex min-h-[44px] items-center justify-between gap-3 text-[13px] text-white/80">
          Dramatic mode
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={dramatic}
            onChange={(e) => {
              setDramatic(e.target.checked)
              persist({ dramatic: e.target.checked })
            }}
            className="h-5 w-5"
          />
        </label>
        <label className="flex min-h-[44px] items-center justify-between gap-3 text-[13px] text-white/80">
          Reduced motion override (all users)
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={reducedAll}
            onChange={(e) => {
              setReducedAll(e.target.checked)
              persist({ reducedAll: e.target.checked })
            }}
            className="h-5 w-5"
          />
        </label>
        <div>
          <p className="text-[12px] text-white/60">Speed: {speed}ms</p>
          <input
            type="range"
            min={500}
            max={2000}
            step={100}
            disabled={!canEdit}
            value={speed}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10)
              setSpeed(v)
              persist({ speed: v })
            }}
            className="mt-1 w-full"
          />
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <h3 className="text-[13px] font-bold text-white">Per-event</h3>
        <div className="max-h-[40vh] space-y-2 overflow-y-auto">
          {EVENTS.map((ev) => (
            <div key={ev} className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-[12px] text-white/75">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={eventOn[ev] !== false}
                  onChange={(e) => {
                    const next = { ...eventOn, [ev]: e.target.checked }
                    setEventOn(next)
                    persist({ eventOn: next })
                  }}
                />
                {ev}
              </label>
              <button
                type="button"
                className="rounded-lg bg-white/10 px-2 py-2 text-[11px] text-white/80"
                onClick={() => {
                  setPreview(ev)
                  window.setTimeout(() => setPreview(null), 3000)
                }}
              >
                Preview
              </button>
            </div>
          ))}
        </div>
        {preview ? (
          <div
            className={previewClass(preview)}
            style={{ animationDuration: `${Math.min(speed, 2000)}ms` }}
          >
            Preview: {preview}
          </div>
        ) : null}
      </section>

      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <h3 className="text-[13px] font-bold text-white">Where animations appear</h3>
        {['League Home', 'Chat', 'Matchup Page', 'Universe Hub'].map((x) => (
          <label key={x} className="flex min-h-[44px] items-center justify-between text-[13px] text-white/75">
            {x}
            <input type="checkbox" defaultChecked className="h-5 w-5" disabled={!canEdit} />
          </label>
        ))}
      </section>

      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <h3 className="text-[13px] font-bold text-white">Icon customization</h3>
        <p className="text-[11px] text-white/45">Emoji picks apply in UI components using iconSystem.</p>
        {(['Survivor', 'Zombie', 'Whisperer', 'Revived'] as const).map((label) => (
          <div key={label} className="flex min-h-[44px] items-center justify-between gap-2">
            <span className="text-[12px] text-white/70">{label}</span>
            <select disabled={!canEdit} className="rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-[12px] text-white">
              <option>Default</option>
              <option>Alt A</option>
              <option>Alt B</option>
            </select>
          </div>
        ))}
      </section>
    </div>
  )
}

function previewClass(ev: string): string {
  if (ev.includes('revive')) return 'revival-anim rounded-lg border border-amber-500/40 p-4 text-center text-[12px]'
  if (ev.includes('maul')) return 'mauling-anim rounded-lg border border-red-500/40 p-4 text-center text-[12px]'
  if (ev.includes('bomb')) return 'bomb-anim rounded-lg border border-red-600/50 p-4 text-center text-[12px]'
  if (ev.includes('serum')) return 'serum-anim rounded-lg border border-teal-500/40 p-4 text-center text-[12px]'
  if (ev.includes('ambush')) return 'ambush-anim rounded-lg border border-red-400/40 p-4 text-center text-[12px]'
  return 'zombie-turn-anim rounded-lg border border-purple-500/40 p-4 text-center text-[12px]'
}

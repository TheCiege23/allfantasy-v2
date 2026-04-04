'use client'

import { useEffect, useState } from 'react'

const KEY = (leagueId: string) => `zombie-advanced-prefs:${leagueId}`

export function ZombieAdvancedPanel({ leagueId, canEdit }: { leagueId: string; canEdit: boolean }) {
  const [auditPlayers, setAuditPlayers] = useState(false)
  const [winningsPublic, setWinningsPublic] = useState(false)
  const [itemsPublic, setItemsPublic] = useState(false)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY(leagueId))
      if (!raw) return
      const j = JSON.parse(raw) as Record<string, unknown>
      if (typeof j.auditPlayers === 'boolean') setAuditPlayers(j.auditPlayers)
      if (typeof j.winningsPublic === 'boolean') setWinningsPublic(j.winningsPublic)
      if (typeof j.itemsPublic === 'boolean') setItemsPublic(j.itemsPublic)
    } catch {
      /* ignore */
    }
  }, [leagueId])

  function save(partial: Partial<{ auditPlayers: boolean; winningsPublic: boolean; itemsPublic: boolean }>) {
    const payload = {
      auditPlayers: partial.auditPlayers ?? auditPlayers,
      winningsPublic: partial.winningsPublic ?? winningsPublic,
      itemsPublic: partial.itemsPublic ?? itemsPublic,
    }
    try {
      sessionStorage.setItem(KEY(leagueId), JSON.stringify(payload))
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6 px-4 py-4 md:px-6">
      <p className="text-[12px] text-white/50">Advanced toggles are stored locally until backed by league settings API.</p>

      <section className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <h3 className="text-[13px] font-bold text-white">Commissioner controls</h3>
        <label className="flex min-h-[44px] items-center justify-between text-[13px] text-white/80">
          Manual status override allowed
          <input type="checkbox" defaultChecked disabled={!canEdit} className="h-5 w-5" />
        </label>
        <label className="flex min-h-[44px] items-center justify-between text-[13px] text-white/80">
          Audit trail visible to players
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={auditPlayers}
            onChange={(e) => {
              setAuditPlayers(e.target.checked)
              save({ auditPlayers: e.target.checked })
            }}
            className="h-5 w-5"
          />
        </label>
        <label className="flex min-h-[44px] items-center justify-between text-[13px] text-white/80">
          Show winnings publicly
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={winningsPublic}
            onChange={(e) => {
              setWinningsPublic(e.target.checked)
              save({ winningsPublic: e.target.checked })
            }}
            className="h-5 w-5"
          />
        </label>
        <label className="flex min-h-[44px] items-center justify-between text-[13px] text-white/80">
          Show item inventories to all
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={itemsPublic}
            onChange={(e) => {
              setItemsPublic(e.target.checked)
              save({ itemsPublic: e.target.checked })
            }}
            className="h-5 w-5"
          />
        </label>
        <label className="flex min-h-[44px] items-center justify-between text-[13px] text-white/80">
          Post-season full reveal
          <input type="checkbox" defaultChecked={false} disabled={!canEdit} className="h-5 w-5" />
        </label>
      </section>

      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <h3 className="text-[13px] font-bold text-white">Edge cases</h3>
        <div className="flex min-h-[44px] flex-col gap-1">
          <span className="text-[12px] text-white/60">Tie resolution</span>
          <select disabled={!canEdit} className="rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-[12px] text-white">
            <option>Higher PF wins</option>
            <option>Commissioner decides</option>
          </select>
        </div>
        <div className="flex min-h-[44px] flex-col gap-1">
          <span className="text-[12px] text-white/60">Stat correction window</span>
          <select disabled={!canEdit} className="rounded-lg border border-white/15 bg-black/40 px-2 py-2 text-[12px] text-white">
            <option>48h</option>
            <option>24h</option>
            <option>72h</option>
          </select>
        </div>
      </section>

      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <h3 className="text-[13px] font-bold text-white">League lifecycle</h3>
        <button
          type="button"
          disabled={!canEdit}
          className="w-full min-h-[48px] rounded-xl bg-red-500/20 text-[13px] font-semibold text-red-200"
          onClick={() => {
            if (confirm('Pause league? This calls commissioner API.')) {
              fetch('/api/zombie/commissioner', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ leagueId, action: 'pause_league', reason: 'Commissioner pause from advanced panel' }),
              }).catch(() => null)
            }
          }}
        >
          Pause league (automation)
        </button>
      </section>

      <section className="space-y-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <h3 className="text-[13px] font-bold text-white">Debug</h3>
        <button
          type="button"
          disabled={!canEdit}
          className="w-full min-h-[48px] rounded-xl bg-white/10 text-[13px] text-white/85"
          onClick={() => {
            fetch('/api/zombie/rules-doc', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ leagueId }),
            }).catch(() => null)
          }}
        >
          Regenerate rules doc
        </button>
      </section>
    </div>
  )
}

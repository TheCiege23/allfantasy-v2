'use client'

import { useEffect, useState } from 'react'
import { SettingsSection, SettingsRow, Select, Input } from '@/app/league/[leagueId]/tabs/settings/components'

export function ZombieUpdatesPanel({ leagueId, canEdit }: { leagueId: string; canEdit: boolean }) {
  const d = !canEdit
  const [day, setDay] = useState('1')
  const [hour, setHour] = useState('9')
  const [autoPost, setAutoPost] = useState(true)
  const [approval, setApproval] = useState(false)
  const [incProj, setIncProj] = useState(true)
  const [incMoney, setIncMoney] = useState(true)
  const [incInv, setIncInv] = useState(true)
  const [incUni, setIncUni] = useState(true)
  const [incDanger, setIncDanger] = useState(true)
  const [preview, setPreview] = useState('')
  const [week, setWeek] = useState('1')
  const [status, setStatus] = useState('')

  useEffect(() => {
    fetch(`/api/zombie/league?leagueId=${encodeURIComponent(leagueId)}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { league?: Record<string, unknown> } | null) => {
        const l = d?.league
        if (!l) return
        if (typeof l.weeklyUpdateDay === 'number') setDay(String(l.weeklyUpdateDay))
        if (typeof l.weeklyUpdateHour === 'number') setHour(String(l.weeklyUpdateHour))
        if (typeof l.weeklyUpdateAutoPost === 'boolean') setAutoPost(l.weeklyUpdateAutoPost)
        if (typeof l.weeklyUpdateApproval === 'boolean') setApproval(l.weeklyUpdateApproval)
        if (typeof l.updateIncludeProjections === 'boolean') setIncProj(l.updateIncludeProjections)
        if (typeof l.updateIncludeMoney === 'boolean') setIncMoney(l.updateIncludeMoney)
        if (typeof l.updateIncludeInventory === 'boolean') setIncInv(l.updateIncludeInventory)
        if (typeof l.updateIncludeUniverse === 'boolean') setIncUni(l.updateIncludeUniverse)
        if (typeof l.updateIncludeDanger === 'boolean') setIncDanger(l.updateIncludeDanger)
        if (typeof l.currentWeek === 'number') setWeek(String(Math.max(1, l.currentWeek)))
      })
      .catch(() => null)
  }, [leagueId])

  async function save() {
    setStatus('Saving…')
    const r = await fetch('/api/zombie/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        leagueId,
        weeklyUpdateDay: parseInt(day, 10),
        weeklyUpdateHour: parseInt(hour, 10),
        weeklyUpdateAutoPost: autoPost,
        weeklyUpdateApproval: approval,
        updateIncludeProjections: incProj,
        updateIncludeMoney: incMoney,
        updateIncludeInventory: incInv,
        updateIncludeUniverse: incUni,
        updateIncludeDanger: incDanger,
      }),
    })
    setStatus(r.ok ? 'Saved' : 'Save failed')
  }

  async function loadPreview() {
    const w = parseInt(week, 10)
    const r = await fetch(
      `/api/zombie/weekly-update?leagueId=${encodeURIComponent(leagueId)}&week=${w}`,
      { credentials: 'include' },
    )
    if (!r.ok) {
      setPreview('Could not load preview (commissioner only).')
      return
    }
    const j = (await r.json()) as { draft?: Record<string, string> }
    const d = j.draft
    if (!d) {
      setPreview('No draft')
      return
    }
    setPreview(
      [
        d.header,
        d.sectionWhisperer,
        d.sectionZombies,
        d.sectionSurvivors,
        d.sectionMoney,
        d.sectionBashingsMaulings,
        d.sectionNewInfections,
        d.footer,
      ]
        .filter(Boolean)
        .join('\n\n'),
    )
  }

  return (
    <div className="space-y-5 px-6 py-6 text-[13px] text-white/85">
      <SettingsSection id="zm-upd-sched" title="Weekly update schedule">
        <SettingsRow
          label="Update day (UTC)"
          control={
            <Select value={day} onChange={setDay} disabled={d}>
              {['0', '1', '2', '3', '4', '5', '6'].map((n) => (
                <option key={n} value={n}>
                  {n} (Sun=0)
                </option>
              ))}
            </Select>
          }
        />
        <SettingsRow
          label="Update hour (UTC)"
          control={<Input type="number" min={0} max={23} value={hour} onChange={(e) => setHour(e.target.value)} disabled={d} className="w-24" />}
        />
        <SettingsRow
          label="Auto-post"
          control={
            <input type="checkbox" checked={autoPost} onChange={(e) => setAutoPost(e.target.checked)} disabled={d} />
          }
        />
        <SettingsRow
          label="Require approval"
          control={
            <input type="checkbox" checked={approval} onChange={(e) => setApproval(e.target.checked)} disabled={d} />
          }
        />
      </SettingsSection>

      <SettingsSection id="zm-upd-content" title="Update content">
        <SettingsRow
          label="Include projections"
          control={<input type="checkbox" checked={incProj} onChange={(e) => setIncProj(e.target.checked)} disabled={d} />}
        />
        <SettingsRow
          label="Include money/points"
          control={<input type="checkbox" checked={incMoney} onChange={(e) => setIncMoney(e.target.checked)} disabled={d} />}
        />
        <SettingsRow
          label="Include inventory snapshot"
          control={<input type="checkbox" checked={incInv} onChange={(e) => setIncInv(e.target.checked)} disabled={d} />}
        />
        <SettingsRow
          label="Include universe movement"
          control={<input type="checkbox" checked={incUni} onChange={(e) => setIncUni(e.target.checked)} disabled={d} />}
        />
        <SettingsRow
          label="Include danger matchups"
          control={<input type="checkbox" checked={incDanger} onChange={(e) => setIncDanger(e.target.checked)} disabled={d} />}
        />
      </SettingsSection>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={d}
          onClick={() => void save()}
          className="rounded-lg bg-sky-500/25 px-4 py-2 text-[12px] font-semibold text-sky-100 disabled:opacity-40"
          data-testid="zombie-updates-save"
        >
          Save zombie update settings
        </button>
        <button
          type="button"
          disabled={d}
          onClick={() => void loadPreview()}
          className="rounded-lg border border-white/15 px-4 py-2 text-[12px] text-white/80 disabled:opacity-40"
        >
          Preview week
        </button>
        <Input type="number" value={week} onChange={(e) => setWeek(e.target.value)} disabled={d} className="w-20" />
      </div>
      {status ? <p className="text-[11px] text-white/50">{status}</p> : null}
      {preview ? (
        <pre className="mt-4 max-h-[320px] overflow-auto rounded-xl border border-white/10 bg-black/40 p-4 text-[11px] text-white/75 whitespace-pre-wrap">
          {preview}
        </pre>
      ) : null}
    </div>
  )
}

'use client'

import type { ScoringCategory } from '@/lib/sportConfig/types'

export function ScoringCategoryEditor({
  categories,
  categoryPoints,
  onChangePoints,
  onResetGroup,
  onResetAll,
  disabled,
  tePremiumNote,
}: {
  categories: ScoringCategory[]
  categoryPoints: Record<string, number>
  onChangePoints: (key: string, points: number) => void
  onResetGroup: (group: string) => void
  onResetAll: () => void
  disabled: boolean
  tePremiumNote?: boolean
}) {
  const byGroup = categories.reduce<Record<string, ScoringCategory[]>>((acc, c) => {
    acc[c.group] = acc[c.group] ?? []
    acc[c.group].push(c)
    return acc
  }, {})

  return (
    <div className="space-y-4 rounded-xl border border-white/[0.08] bg-[#0a1220]/80 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold text-white/90">Scoring categories</p>
        <button
          type="button"
          disabled={disabled}
          className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-sky-300 hover:bg-white/[0.06] disabled:opacity-40"
          onClick={onResetAll}
        >
          Reset all to defaults
        </button>
      </div>
      {tePremiumNote ? (
        <p className="text-[11px] text-white/50">
          TE Premium: extra points per tight end reception (when enabled below).
        </p>
      ) : null}
      {Object.entries(byGroup).map(([group, cats]) => (
        <div key={group} className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wide text-white/40">{group}</span>
            <button
              type="button"
              disabled={disabled}
              className="text-[11px] text-sky-300/90 hover:underline disabled:opacity-40"
              onClick={() => onResetGroup(group)}
            >
              Reset group
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-[12px]">
              <tbody>
                {cats.map((c) => {
                  const v = categoryPoints[c.key] ?? c.defaultPoints
                  return (
                    <tr key={c.key} className="border-t border-white/[0.06]">
                      <td className="py-2 pr-2 text-white/75">{c.label}</td>
                      <td className="py-2 text-right">
                        <input
                          type="number"
                          step="0.01"
                          disabled={disabled}
                          className="w-24 rounded border border-white/[0.12] bg-[#080c14] px-2 py-1 text-right text-white"
                          value={Number.isFinite(v) ? v : 0}
                          onChange={(e) => onChangePoints(c.key, Number(e.target.value))}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}

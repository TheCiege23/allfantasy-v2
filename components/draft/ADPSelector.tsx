'use client'

import { useState } from 'react'
import type { ADPSource, ADPWeights } from '@/lib/workers/adp-blender'

export function ADPSelector({
  source,
  weights,
  onApply,
}: {
  source: ADPSource
  weights: ADPWeights
  onApply?: (next: { source: ADPSource; weights: ADPWeights }) => void
}) {
  const [selected, setSelected] = useState<ADPSource>(source)
  const [draftWeights, setDraftWeights] = useState<ADPWeights>(weights)

  const setWeight = (key: keyof ADPWeights, value: number) => {
    setDraftWeights((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[#081121] p-4">
      <p className="text-sm font-semibold text-white">Draft ADP Settings</p>
      <div className="space-y-2">
        {(['api', 'global_app', 'ai', 'blended', 'custom'] as ADPSource[]).map((option) => (
          <label key={option} className="flex items-center gap-2 text-sm text-white/75">
            <input
              type="radio"
              name="draft-adp-source"
              checked={selected === option}
              onChange={() => setSelected(option)}
            />
            <span>{option.replace('_', ' ')}</span>
          </label>
        ))}
      </div>

      {selected === 'blended' ? (
        <div className="space-y-3">
          {([
            ['api', 'API'],
            ['app', 'App'],
            ['ai', 'AI'],
          ] as const).map(([key, label]) => (
            <label key={key} className="block text-xs text-white/55">
              <span>{label}</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round((draftWeights[key] ?? 0) * 100) || draftWeights[key]}
                onChange={(event) => setWeight(key, Number(event.target.value))}
                className="mt-2 block w-full"
              />
            </label>
          ))}
        </div>
      ) : null}

      {onApply ? (
        <button
          type="button"
          onClick={() => onApply({ source: selected, weights: draftWeights })}
          className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100"
        >
          Apply to Draft
        </button>
      ) : null}
    </div>
  )
}

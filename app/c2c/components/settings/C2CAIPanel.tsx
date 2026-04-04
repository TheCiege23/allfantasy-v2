'use client'

export function C2CAIPanel({ hasAfSub }: { hasAfSub: boolean }) {
  const rows = [
    ['Campus scouting', 'c2c-ai-campus'],
    ['Transition projections', 'c2c-ai-transition'],
    ['Roster balance', 'c2c-ai-balance'],
    ['Draft AI', 'c2c-ai-draft'],
    ['Commissioner copilot', 'c2c-ai-copilot'],
    ['Weekly recaps', 'c2c-ai-recaps'],
  ] as const

  return (
    <div className="space-y-3 px-6 py-6 text-[13px]" data-testid="c2c-ai-panel">
      {!hasAfSub ? (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100/90">
          AfSub commissioner features are gated — toggles are preview-only.
        </p>
      ) : null}
      {rows.map(([label, tid]) => (
        <label key={tid} className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-2">
          <span className="text-white/75">{label}</span>
          <input type="checkbox" disabled={!hasAfSub} defaultChecked={hasAfSub} data-testid={tid} />
        </label>
      ))}
    </div>
  )
}

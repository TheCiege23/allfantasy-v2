'use client'

export interface ChimmyPremiumAlertTeaserProps {
  title?: string
  description?: string
  onUpgrade?: () => void
}

export default function ChimmyPremiumAlertTeaser({
  title = 'Premium Alert Intelligence',
  description = 'Unlock advanced urgency modeling, grouped recommendations, and proactive specialty-league alerts.',
  onUpgrade,
}: ChimmyPremiumAlertTeaserProps) {
  return (
    <div className="rounded-xl border border-cyan-500/25 bg-cyan-950/20 p-3">
      <p className="text-xs font-semibold text-cyan-200">{title}</p>
      <p className="mt-1 text-[11px] text-cyan-100/70">{description}</p>
      <button
        type="button"
        onClick={onUpgrade}
        className="mt-2 rounded-md border border-cyan-400/40 bg-cyan-400/15 px-2.5 py-1 text-[11px] font-medium text-cyan-200 hover:bg-cyan-400/20"
      >
        Upgrade
      </button>
    </div>
  )
}

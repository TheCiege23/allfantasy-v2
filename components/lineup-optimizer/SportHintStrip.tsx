'use client'

const HINTS: Record<string, string> = {
  NFL: 'Weekly lock · check weather for outdoor passing games.',
  NBA: 'Daily slates · watch back-to-backs and rest nights.',
  MLB: 'Track two-start SPs and platoon risk.',
  NHL: 'PP units and confirmed goalie starts matter.',
  SOCCER: 'XI probability and rotation risk before lock.',
  GOLF: 'Event scoring — field strength and cut risk.',
  NASCAR: 'Track / qualifying shape weekly finishes.',
  NCAAF: 'Campus slates · injury reports drive roles.',
  NCAAB: 'Minutes and foul trouble on tight schedules.',
}

export function SportHintStrip({ sport }: { sport: string }) {
  const u = sport.toUpperCase()
  const text = HINTS[u] ?? 'Use sport-specific news and lock times before submitting.'
  return (
    <p className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] text-white/55" role="note">
      <span className="font-semibold text-cyan-200/80">{u}</span> · {text}
    </p>
  )
}

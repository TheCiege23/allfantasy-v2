export function ExileTokenSummaryCard({
  balance,
  needed,
  events,
}: {
  balance: number
  needed?: number
  events: { label: string; delta: string }[]
}) {
  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-950/40 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-violet-200">🪙 Exile tokens</p>
      <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-white">{balance}</p>
      {needed != null ? (
        <p className="mt-1 text-[12px] text-white/55">You need {needed} more tokens to qualify.</p>
      ) : null}
      <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-[11px] text-white/55">
        {events.map((e, i) => (
          <li key={i}>
            <span className="font-mono text-emerald-300/90">{e.delta}</span> {e.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

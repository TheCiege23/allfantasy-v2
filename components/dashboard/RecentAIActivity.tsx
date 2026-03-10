export default function RecentAIActivity() {
  const items = [
    "Trade Command Center refreshed 2m ago",
    "Waiver suggestions updated from live news overlay",
    "Draft board probabilities recalculated for your league",
  ]

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="text-sm font-semibold text-white">Recent AI Activity</h3>
      <ul className="mt-3 space-y-2 text-xs text-white/70">
        {items.map((item) => (
          <li key={item} className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
            {item}
          </li>
        ))}
      </ul>
    </section>
  )
}

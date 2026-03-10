'use client'

export default function LegacyOverviewLaunchCard() {
  return (
    <a
      href="/brackets"
      className="block rounded-2xl border border-purple-500/25 bg-gradient-to-r from-purple-800/20 via-indigo-800/20 to-purple-800/20 p-4 hover:border-purple-400/40 transition group"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">NCAA</span>
        <div className="flex-1">
          <div className="text-sm font-semibold text-white">NCAA Bracket Challenge</div>
          <div className="text-xs text-white/50 mt-0.5">Create a bracket league with your dynasty group and compete.</div>
        </div>
        <span className="text-white/30 group-hover:text-white/60 transition text-lg">&rarr;</span>
      </div>
    </a>
  )
}


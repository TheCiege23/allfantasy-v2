'use client'

export default function LegacyPlayerFinderIntro() {
  return (
    <>
      <p className="text-center text-sm sm:text-base text-white/60 mb-4">Find players by value, momentum, and roster fit - not hype.</p>
      <div className="flex items-start sm:items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-cyan-500/30 flex items-center justify-center text-xl flex-shrink-0">&#x1F50D;</div>
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-cyan-400">Player Finder</h3>
          <p className="text-xs sm:text-sm text-gray-400">Find which of your leagues you own a specific player in</p>
        </div>
      </div>
    </>
  )
}

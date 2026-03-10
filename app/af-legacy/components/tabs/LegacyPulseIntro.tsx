'use client'

export default function LegacyPulseIntro() {
  return (
    <>
      <p className="text-center text-sm sm:text-base text-white/60 mb-4">Understand player narratives before the market shifts.</p>
      <div className="flex items-start sm:items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center text-xl flex-shrink-0">&#x1F4E1;</div>
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-cyan-400">Social Pulse</h3>
          <p className="text-xs sm:text-sm text-gray-400">Live X and web search for real-time player/team news and sentiment</p>
        </div>
      </div>
    </>
  )
}

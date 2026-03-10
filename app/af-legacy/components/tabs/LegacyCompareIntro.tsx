'use client'

export default function LegacyCompareIntro() {
  return (
    <>
      <p className="text-center text-sm sm:text-base text-white/60 mb-4">One question. One answer. Who should you choose?</p>
      <div className="flex items-start sm:items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500/30 to-orange-500/30 flex items-center justify-center text-xl flex-shrink-0">&#x2694;&#xFE0F;</div>
        <div>
          <h3 className="text-lg sm:text-xl font-bold text-cyan-400">Manager Comparison</h3>
          <p className="text-xs sm:text-sm text-gray-400">Compare any two Sleeper managers instantly</p>
        </div>
      </div>
    </>
  )
}

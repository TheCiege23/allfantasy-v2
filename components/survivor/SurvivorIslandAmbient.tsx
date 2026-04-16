'use client'

/** Tropical / island cinematic backdrop for Survivor commissioner surfaces. */
export function SurvivorIslandAmbient() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <div className="absolute inset-0 bg-[#030806]" />
      <div className="absolute -left-1/4 top-0 h-[72vh] w-[72vw] rounded-full bg-emerald-600/[0.09] blur-[118px]" />
      <div className="absolute -right-1/4 bottom-0 h-[58vh] w-[58vw] rounded-full bg-amber-600/[0.07] blur-[96px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_45%_at_50%_-15%,rgba(251,191,36,0.09),transparent)]" />
      <div
        className="absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='96' viewBox='0 0 96 96'%3E%3Cg fill='none' stroke='%23ffffff' stroke-opacity='0.025'%3E%3Cpath d='M0 48h96M48 0v96M24 24l48 48M72 24L24 72'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

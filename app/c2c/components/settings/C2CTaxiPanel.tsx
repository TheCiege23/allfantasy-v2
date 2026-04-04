'use client'

export function C2CTaxiPanel() {
  return (
    <div className="space-y-3 px-6 py-6 text-[13px] text-white/75" data-testid="c2c-taxi-panel">
      <p className="text-[12px] text-white/55">
        Taxi rules mirror Devy-style eligibility: rookie-only, experience caps, and lock deadlines — commissioner
        saves will use the same C2C league fields.
      </p>
      <label className="block">
        <span className="text-[11px] text-white/45">Taxi lock deadline</span>
        <input type="datetime-local" className="mt-1 w-full rounded-lg border border-white/[0.08] bg-black/30 px-3 py-2" disabled />
      </label>
      <label className="flex items-center gap-2 text-[12px]">
        <input type="checkbox" defaultChecked disabled />
        Rookie-only taxi
      </label>
      <label className="flex items-center gap-2 text-[12px]">
        <input type="checkbox" defaultChecked disabled />
        Taxi points visible (display)
      </label>
    </div>
  )
}

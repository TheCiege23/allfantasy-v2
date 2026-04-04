'use client'

import { devyBool, devyNum, devyStr } from './devyConfigDisplay'

export function DevyTaxiPanel({ config }: { config: Record<string, unknown> | null }) {
  return (
    <div className="space-y-4 px-4 py-5 text-[13px] text-white/85 md:px-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#0a1228] p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-amber-200/90">Taxi</h3>
        <ul className="mt-3 space-y-2 text-[12px] text-white/70">
          <li>Taxi slots: {devyNum(config, 'taxiSlots')}</li>
          <li>Rookie only: {devyBool(config, 'taxiRookieOnly') ? 'On' : 'Off'}</li>
          <li>Allow non-rookies: {devyBool(config, 'taxiAllowNonRookies') ? 'On' : 'Off'}</li>
          <li>Max experience years: {devyNum(config, 'taxiMaxExperienceYears')}</li>
          <li>Taxi lock deadline: {devyStr(config, 'taxiLockDeadline')}</li>
          <li>Points visible (display): {devyBool(config, 'taxiPointsVisibleDisplay', true) ? 'On' : 'Off'}</li>
          <li className="rounded border border-white/[0.08] bg-black/30 px-2 py-1 text-white/50">
            Points count toward score: locked off (cannot be changed) — engine value:{' '}
            {String(devyBool(config, 'taxiPointsCountToward'))}
          </li>
          <li>Can return after promotion: {devyBool(config, 'taxiCanReturnAfterPromo') ? 'On' : 'Off'}</li>
          <li>Devy → rookie taxi eligible: {devyBool(config, 'taxiDevyToRookieEligible', true) ? 'On' : 'Off'}</li>
          <li>Poaching: {devyBool(config, 'taxiPoachaingEnabled') ? 'On' : 'Off'}</li>
        </ul>
      </section>
    </div>
  )
}

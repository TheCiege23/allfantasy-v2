'use client'

import { devyBool, devyNum, devyStr } from './devyConfigDisplay'

export function DevyRulesPanel({ config }: { config: Record<string, unknown> | null }) {
  return (
    <div className="space-y-4 px-4 py-5 text-[13px] text-white/85 md:px-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#0a1228] p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-violet-200/90">Eligibility & visibility</h3>
        <ul className="mt-3 space-y-2 text-[12px] text-white/70">
          <li>Freshmen eligible: {devyBool(config, 'devyFreshmenEligible') ? 'On' : 'Off'}</li>
          <li>Declaration year visibility: {devyBool(config, 'devyDeclarationVisibility') ? 'On' : 'Off'}</li>
          <li>Devy pick trading: {devyBool(config, 'devyPickTradingEnabled') ? 'On' : 'Off'}</li>
          <li>Max devy per team: {devyNum(config, 'maxDevyPerTeam')}</li>
          <li>Auto-promote to rookie: {devyBool(config, 'devyAutoPromoteToRookie') ? 'On' : 'Off'}</li>
          {!devyBool(config, 'devyAutoPromoteToRookie', true) ? (
            <li className="text-amber-200/80">If not auto: commissioner review queue applies.</li>
          ) : null}
          <li>Graduation behavior: {devyStr(config, 'devyGradBehavior')}</li>
        </ul>
      </section>
    </div>
  )
}

'use client'

import { devyBool, devyStr } from './devyConfigDisplay'

export function DevyDraftsPanel({ config }: { config: Record<string, unknown> | null }) {
  return (
    <div className="space-y-4 px-4 py-5 text-[13px] text-white/85 md:px-6">
      <section className="rounded-xl border border-white/[0.08] bg-[#0a1228] p-4">
        <h3 className="text-[12px] font-bold uppercase tracking-wide text-cyan-200/90">Draft trading</h3>
        <ul className="mt-3 space-y-2 text-[12px] text-white/70">
          <li>Rookie pick trading: {devyBool(config, 'rookiePickTradingEnabled', true) ? 'On' : 'Off'}</li>
          <li>Devy pick trading: {devyBool(config, 'devyPickTradingEnabled', true) ? 'On' : 'Off'}</li>
        </ul>
      </section>
      <section className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-[12px] text-amber-100/80">
        Startup / future draft clocks and depleted-pick behavior are not yet exposed on this config row — follow-up
        will add fields when the engine stores them.
      </section>
      <p className="text-[11px] text-white/40">futureDraftFormat: {devyStr(config, 'futureDraftFormat')}</p>
    </div>
  )
}

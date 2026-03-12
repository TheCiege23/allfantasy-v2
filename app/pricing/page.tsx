\"use client\"

import Link from "next/link"
import Script from "next/script"

export default function PricingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060a] text-white">
      <Script src="https://js.stripe.com/v3/buy-button.js" strategy="afterInteractive" />

      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-cyan-400/10 blur-[160px]" />
        <div className="absolute top-52 -left-56 h-[520px] w-[520px] rounded-full bg-fuchsia-500/7 blur-[180px]" />
        <div className="absolute -bottom-64 right-0 h-[560px] w-[560px] rounded-full bg-indigo-500/9 blur-[190px]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <Link
          href="/"
          className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-sm text-white/50 transition hover:text-white/80 sm:mb-8"
        >
          <span aria-hidden>&larr;</span> Back to Home
        </Link>

        <div className="mb-6 text-center sm:mb-10">
          <h1 className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-2xl font-bold text-transparent sm:text-3xl md:text-4xl">
            Choose Your Plan
          </h1>
          <p className="mt-2 text-sm text-white/50 sm:mt-3 sm:text-base">
            Unlock the full power of AI-driven fantasy sports.
          </p>
        </div>

        <div className="mx-auto grid max-w-md grid-cols-1 gap-4 overflow-visible sm:max-w-none sm:grid-cols-2">
          <div className="group relative rounded-2xl bg-gradient-to-br from-white/20 via-white/5 to-transparent p-[1px] sm:rounded-3xl">
            <div className="flex h-full flex-col rounded-[15px] bg-gradient-to-br from-[#0a0c12] via-[#0d1018] to-[#080a0f] p-4 sm:rounded-[23px] sm:p-5">
              <div className="text-xs font-medium uppercase tracking-wider text-white/40">Free</div>
              <h3 className="mt-1.5 text-lg font-bold text-white sm:mt-2 sm:text-xl">AF Free</h3>
              <p className="mt-1 text-xs text-white/40">The core experience with no AI add-ons.</p>
              <div className="mt-2.5 sm:mt-3">
                <span className="text-2xl font-black text-white sm:text-3xl">$0</span>
                <span className="text-sm text-white/40">/forever</span>
              </div>
              <ul className="mt-3 flex-1 space-y-2 text-sm text-white/60 sm:mt-4">
                <li className="flex items-center gap-2"><span className="text-emerald-400">+</span> Unlimited leagues</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">+</span> League and DM chat</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">+</span> Legacy import and ranking</li>
                <li className="flex items-center gap-2"><span className="text-emerald-400">+</span> Career stats and history</li>
                <li className="flex items-center gap-2"><span className="text-red-400/70">-</span> <span className="text-white/40">No AI features</span></li>
              </ul>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-sm text-white/65 sm:mt-4">
                Included with every account. Legacy refresh: 1/week.
              </div>
            </div>
          </div>

          <div className="group relative rounded-2xl bg-gradient-to-br from-cyan-500/40 via-cyan-500/10 to-transparent p-[1px] sm:rounded-3xl">
            <div className="absolute -inset-1 rounded-3xl bg-cyan-500/10 opacity-30 blur-xl" />
            <div className="relative flex h-full flex-col rounded-[15px] bg-gradient-to-br from-[#0a0c12] via-[#0d1018] to-[#080a0f] p-4 sm:rounded-[23px] sm:p-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-cyan-400/70">Pro</span>
                <span className="rounded-full border border-cyan-400/30 bg-cyan-500/20 px-2 py-0.5 text-[10px] font-medium text-cyan-300">Popular</span>
              </div>
              <h3 className="mt-1.5 bg-gradient-to-r from-cyan-200 to-cyan-400 bg-clip-text text-lg font-bold text-transparent sm:mt-2 sm:text-xl">AF Pro</h3>
              <p className="mt-1 text-xs text-cyan-300/50">For competitive players</p>
              <div className="mt-2.5 sm:mt-3">
                <span className="text-2xl font-black text-white sm:text-3xl">$9.99</span>
                <span className="text-sm text-white/40">/month</span>
              </div>
              <div className="mt-1 text-xs text-cyan-300/60">or $99.99/year (save 17%)</div>
              <ul className="mt-3 flex-1 space-y-2 text-sm text-white/60 sm:mt-4">
                <li className="flex items-center gap-2"><span className="text-cyan-400">+</span> Everything in Free</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">+</span> AI Analysis (25/day)</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">+</span> AI Coach (25/day)</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">+</span> Start/Sit advice</li>
                <li className="flex items-center gap-2"><span className="text-cyan-400">+</span> Auto league settings</li>
              </ul>
              <PlanCheckoutOptions
                accent="rgba(34, 211, 238, 0.35)"
                monthlyId={BUY_BUTTONS.pro.monthly}
                monthlyPrice="$9.99 / month"
                yearlyId={BUY_BUTTONS.pro.yearly}
                yearlyPrice="$99.99 / year"
                yearlyNote="Save 17%"
              />
              <div className="mt-3 border-t border-white/10 pt-3 sm:mt-4 sm:pt-4">
                <span className="text-xs text-cyan-300/50">Legacy refresh: Daily</span>
              </div>
            </div>
          </div>

          <div className="group relative rounded-2xl bg-gradient-to-br from-purple-500/40 via-purple-500/10 to-transparent p-[1px] sm:rounded-3xl">
            <div className="absolute -inset-1 rounded-3xl bg-purple-500/10 opacity-30 blur-xl" />
            <div className="relative flex h-full flex-col rounded-[15px] bg-gradient-to-br from-[#0a0c12] via-[#0d1018] to-[#080a0f] p-4 sm:rounded-[23px] sm:p-5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium uppercase tracking-wider text-purple-400/70">Commissioner</span>
                <span className="text-lg">AI</span>
              </div>
              <h3 className="mt-1.5 bg-gradient-to-r from-purple-200 to-purple-400 bg-clip-text text-base font-bold text-transparent sm:mt-2 sm:text-lg">AF Super Commissioner</h3>
              <p className="mt-1 text-xs text-purple-300/50">Run the best league possible</p>
              <div className="mt-2.5 sm:mt-3">
                <span className="text-2xl font-black text-white sm:text-3xl">$4.99</span>
                <span className="text-sm text-white/40">/month</span>
              </div>
              <div className="mt-1 text-xs text-purple-300/60">or $49.99/year (save 17%)</div>
              <ul className="mt-3 flex-1 space-y-2 text-sm text-white/60 sm:mt-4">
                <li className="flex items-center gap-2"><span className="text-purple-400">+</span> AI collusion detection</li>
                <li className="flex items-center gap-2"><span className="text-purple-400">+</span> AI tanking detection</li>
                <li className="flex items-center gap-2"><span className="text-purple-400">+</span> AI weekly recaps</li>
                <li className="flex items-center gap-2"><span className="text-purple-400">+</span> AI rivalry weeks</li>
                <li className="flex items-center gap-2"><span className="text-purple-400">+</span> League import (Sleeper)</li>
                <li className="flex items-center gap-2"><span className="text-red-400/70">-</span> <span className="text-white/40">No player AI</span></li>
              </ul>
              <PlanCheckoutOptions
                accent="rgba(192, 132, 252, 0.35)"
                monthlyId={BUY_BUTTONS.commissioner.monthly}
                monthlyPrice="$4.99 / month"
                yearlyId={BUY_BUTTONS.commissioner.yearly}
                yearlyPrice="$49.99 / year"
                yearlyNote="Save 17%"
              />
              <div className="mt-3 border-t border-white/10 pt-3 sm:mt-4 sm:pt-4">
                <span className="text-xs text-purple-300/50">Commissioner AI: Unlimited</span>
              </div>
            </div>
          </div>

          <div className="group relative rounded-2xl bg-gradient-to-br from-amber-500/50 via-yellow-500/20 to-orange-500/30 p-[1px] shadow-[0_0_30px_rgba(251,191,36,0.15)] sm:rounded-3xl">
            <div className="pointer-events-none absolute -inset-1 rounded-3xl bg-amber-500/15 opacity-30 blur-xl" />
            <div className="rounded-[15px] bg-gradient-to-br from-[#0f0d08] via-[#0d1018] to-[#080a0f] p-4 sm:rounded-[23px] sm:p-5">
              <div className="text-xs font-medium uppercase tracking-wider text-amber-400/80">Supreme</div>
              <h3 className="mt-1.5 bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-lg font-bold text-transparent sm:mt-2 sm:text-xl">AF Supreme</h3>
              <p className="mt-1 text-xs text-amber-300/50">Power user, status, and no friction</p>
              <div className="mt-2.5 sm:mt-3">
                <span className="text-2xl font-black text-white sm:text-3xl">$12.99</span>
                <span className="text-sm text-white/40">/month</span>
              </div>
              <div className="mt-1 text-xs text-amber-300/60">or $120.99/year (save 22%)</div>
              <ul className="mt-3 space-y-2 text-sm text-white/60 sm:mt-4">
                <li className="flex items-center gap-2"><span className="text-amber-400">+</span> All Free features</li>
                <li className="flex items-center gap-2"><span className="text-amber-400">+</span> All Pro features</li>
                <li className="flex items-center gap-2"><span className="text-amber-400">+</span> All Commissioner features</li>
                <li className="flex items-center gap-2"><span className="text-amber-400">+</span> Supreme badge</li>
                <li className="flex items-center gap-2"><span className="text-amber-400">+</span> Priority feature access</li>
                <li className="flex items-center gap-2"><span className="text-amber-400">+</span> Unlimited everything</li>
              </ul>
              <PlanCheckoutOptions
                accent="rgba(251, 191, 36, 0.35)"
                monthlyId={BUY_BUTTONS.supreme.monthly}
                monthlyPrice="$12.99 / month"
                yearlyId={BUY_BUTTONS.supreme.yearly}
                yearlyPrice="$120.99 / year"
                yearlyNote="Save 22%"
              />
              <div className="mt-3 border-t border-amber-500/20 pt-3 sm:mt-4 sm:pt-4">
                <span className="text-xs text-amber-300/60">All AI: Unlimited</span>
              </div>
            </div>
            <div className="pointer-events-none absolute -right-3 -top-3 z-10">
              <span className="text-3xl drop-shadow-[0_2px_10px_rgba(251,191,36,0.8)] sm:text-4xl">C</span>
            </div>
          </div>
        </div>

        <div className="pb-8 pt-8 text-center sm:pt-10">
          <div className="mx-auto max-w-2xl rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/60">
            Every paid plan now checks out directly through Stripe on this page. Free stays free.
          </div>
        </div>
      </div>
    </main>
  )
}

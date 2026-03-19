'use client'

import Link from 'next/link'
import { LogIn, UserPlus, Smartphone } from 'lucide-react'
import { trackLandingCtaClick } from '@/lib/landing-analytics'

export default function LandingFinalCTA() {
  return (
    <section className="border-t px-4 py-16 sm:px-6 sm:py-20" style={{ borderColor: 'var(--border)' }}>
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-2xl font-extrabold sm:text-3xl md:text-4xl bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent">
          Ready to dominate your league?
        </h2>
        <p className="mt-3 text-sm sm:text-base" style={{ color: 'var(--muted)' }}>
          Create your free account and get instant access to AI drafting, trade analysis, waiver picks, and bracket tools — all in one place.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <Link
            href="/signup"
            className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg hover:from-cyan-400 hover:to-purple-500 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 touch-manipulation"
            onClick={() => trackLandingCtaClick({ cta_label: 'Create Free Account', cta_destination: '/signup', cta_type: 'primary', source: 'final_cta' })}
          >
            <UserPlus className="h-5 w-5 shrink-0" />
            <span>Create Free Account</span>
          </Link>
          <Link
            href="/login"
            className="inline-flex min-h-[52px] w-full sm:w-auto items-center justify-center gap-2 rounded-xl border-2 border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white/80 hover:bg-white/10 hover:border-white/30 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-white/30 focus:ring-offset-2 touch-manipulation"
            onClick={() => trackLandingCtaClick({ cta_label: 'Sign In', cta_destination: '/login', cta_type: 'secondary', source: 'final_cta' })}
          >
            <LogIn className="h-5 w-5 shrink-0" />
            <span>Sign In</span>
          </Link>
        </div>

        {/* Download App coming soon */}
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2 text-xs text-white/40 cursor-default select-none"
            title="Mobile app coming soon"
          >
            <Smartphone className="h-3.5 w-3.5" />
            Download App — Coming Soon
          </button>
        </div>

        <p className="mt-4 text-xs" style={{ color: 'var(--muted2)' }}>
          Free to start · No credit card required
        </p>
      </div>
    </section>
  )
}

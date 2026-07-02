'use client'

import { Brain, CheckCircle2, Clock3, Info, ShieldAlert, Sparkles, Target } from 'lucide-react'
import type { ManagerDnaViewModel } from '@/lib/decision-os/manager-dna'

type ManagerDnaCardProps = {
  profile: ManagerDnaViewModel
  variant?: 'dashboard' | 'league' | 'commissioner' | 'team'
  compact?: boolean
}

function formatUpdated(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Updated just now'
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export default function ManagerDnaCard({ profile, variant = 'dashboard', compact = false }: ManagerDnaCardProps) {
  const isInsufficient = profile.status === 'insufficient-data'
  const traits = profile.traits.slice(0, compact ? 3 : 5)

  return (
    <section
      data-testid={`manager-dna-card-${variant}`}
      className="card-premium overflow-hidden p-0"
      aria-label={`${profile.title}: ${profile.primaryIdentity}`}
    >
      <div className="border-b border-subtle bg-surface-muted/60 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/25 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-primary">
            <Brain className="h-3.5 w-3.5" aria-hidden />
            Manager DNA
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-subtle bg-surface px-2.5 py-1 text-[11px] font-semibold text-secondary">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary" aria-hidden />
            {profile.confidenceLabel} confidence
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            {formatUpdated(profile.lastUpdatedIso)}
          </span>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">{profile.subtitle}</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-primary md:text-3xl">
              {profile.primaryIdentity}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary">
              A plain-language read on how this manager tends to decide, transact, take risk, and stay engaged.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 lg:min-w-[320px]">
            <MiniMetric label="Decision" value={profile.decisionStyle} />
            <MiniMetric label="Transactions" value={profile.transactionStyle} />
            <MiniMetric label="Risk" value={profile.riskTendency} />
            <MiniMetric label="Reliability" value={profile.engagementReliability} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {isInsufficient && profile.insufficientData ? (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-amber-100">
              <div className="flex items-start gap-2">
                <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                <div>
                  <p className="text-sm font-bold">{profile.insufficientData.title}</p>
                  <p className="mt-1 text-sm leading-6 text-amber-100/80">{profile.insufficientData.message}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/75">
                    Missing: {profile.insufficientData.missing.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-subtle bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Supporting evidence</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {profile.evidence.slice(0, 3).map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-xl border border-subtle bg-surface-muted px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-primary">{item.value}</p>
                  {item.detail ? <p className="mt-1 text-xs text-secondary">{item.detail}</p> : null}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-subtle bg-surface-muted p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Top traits</p>
            {traits.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {traits.map((trait) => (
                  <span
                    key={`${trait.label}-${trait.strength}`}
                    className="rounded-full border border-subtle bg-surface px-3 py-1 text-xs font-semibold text-secondary"
                  >
                    {trait.label} / {trait.strength}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 flex items-center gap-2 text-sm text-muted">
                <Info className="h-4 w-4" aria-hidden />
                Traits will appear after more weekly behavior is available.
              </p>
            )}
          </div>
        </div>

        <aside className="rounded-2xl border border-brand-primary/20 bg-brand-primary/10 p-4">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-brand-primary">
            <Target className="h-4 w-4" aria-hidden />
            Coaching focus
          </p>
          <p className="mt-3 text-sm leading-6 text-primary">{profile.coachingFocus}</p>
          <p className="mt-4 text-xs leading-5 text-muted">
            This profile is descriptive, not a judgment. Use it to make fantasy feel easier, clearer, and more fun.
          </p>
        </aside>
      </div>
    </section>
  )
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-subtle bg-surface px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-black text-primary">{value}</p>
    </div>
  )
}

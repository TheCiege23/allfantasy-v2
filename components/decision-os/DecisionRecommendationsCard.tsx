'use client'

import { AlertTriangle, CheckCircle2, Clock3, Info, ListChecks, Sparkles } from 'lucide-react'
import type { DecisionRecommendationsViewModel } from '@/lib/decision-os/recommendations'

type DecisionRecommendationsCardProps = {
  model: DecisionRecommendationsViewModel
  variant?: 'dashboard' | 'league' | 'commissioner' | 'team'
  compact?: boolean
}

function formatUpdated(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Updated just now'
  return `Updated ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

function priorityClass(priority: string) {
  const value = priority.toLowerCase()
  if (value === 'critical') return 'border-rose-500/25 bg-rose-500/10 text-rose-300'
  if (value === 'high') return 'border-amber-500/25 bg-amber-500/10 text-amber-300'
  if (value === 'medium') return 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300'
  return 'border-subtle bg-surface-muted text-secondary'
}

export default function DecisionRecommendationsCard({
  model,
  variant = 'dashboard',
  compact = false,
}: DecisionRecommendationsCardProps) {
  const isInsufficient = model.status === 'insufficient-data'
  const recommendations = model.recommendations.slice(0, compact ? 2 : 3)

  return (
    <section
      data-testid={`decision-recommendations-card-${variant}`}
      className="card-premium overflow-hidden p-0"
      aria-label={`${model.title}: ${model.subtitle}`}
    >
      <div className="border-b border-subtle bg-surface-muted/60 px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary/25 bg-brand-primary/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-brand-primary">
            <ListChecks className="h-3.5 w-3.5" aria-hidden />
            Recommended Moves
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-subtle bg-surface px-2.5 py-1 text-[11px] font-semibold text-secondary">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-primary" aria-hidden />
            {model.confidenceLabel} confidence
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] font-medium text-muted">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            {formatUpdated(model.lastUpdatedIso)}
          </span>
        </div>
        <h2 className="mt-4 text-2xl font-black tracking-tight text-primary md:text-3xl">{model.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-secondary">
          A short action queue with priority, impact, difficulty, evidence, and one suggested next step.
        </p>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-[0.9fr_1.1fr]">
        <aside className="space-y-4">
          <div className="rounded-2xl border border-subtle bg-surface p-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">Supporting evidence</p>
            <div className="mt-3 grid gap-2">
              {model.evidence.slice(0, 3).map((item) => (
                <div key={`${item.label}-${item.value}`} className="rounded-xl border border-subtle bg-surface-muted px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{item.label}</p>
                  <p className="mt-1 text-sm font-bold text-primary">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          {isInsufficient && model.insufficientData ? (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-amber-100">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
                <div>
                  <p className="text-sm font-bold">{model.insufficientData.title}</p>
                  <p className="mt-1 text-sm leading-6 text-amber-100/80">{model.insufficientData.message}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-amber-200/75">
                    Missing: {model.insufficientData.missing.join(', ')}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </aside>

        <div className="space-y-3">
          {recommendations.length > 0 ? (
            recommendations.map((item, index) => (
              <article key={`${item.title}-${index}`} className="rounded-2xl border border-subtle bg-surface-muted p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-bold ${priorityClass(item.priority)}`}>
                    {item.priority}
                  </span>
                  <span className="rounded-full border border-subtle bg-surface px-2.5 py-1 text-[11px] font-semibold text-secondary">
                    {item.difficulty}
                  </span>
                  {item.completionStatus ? (
                    <span className="rounded-full border border-subtle bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
                      {item.completionStatus}
                    </span>
                  ) : null}
                </div>
                <h3 className="mt-3 text-lg font-black text-primary">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-secondary">{item.expectedImpact}</p>
                <div className="mt-3 rounded-xl border border-brand-primary/20 bg-brand-primary/10 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-primary">
                    Suggested action
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">{item.suggestedAction}</p>
                </div>
                {item.evidence.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.evidence.map((evidence) => (
                      <span key={evidence} className="rounded-full border border-subtle bg-surface px-2.5 py-1 text-[11px] text-secondary">
                        {evidence}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-subtle bg-surface-muted p-6 text-sm text-muted">
              <Info className="mb-2 h-5 w-5" aria-hidden />
              No grounded moves are ready yet.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/**
 * Fantasy OS Phase 4 — shared executive visualization primitives (Part 8).
 *
 * Presentational, theme-aware, white-label-safe building blocks used across all seven workspace surfaces.
 * They reuse the app's semantic status / content / surface tokens so light/dark + re-theme are honored.
 * Truth labels are ALWAYS rendered adjacent to the value/section they describe (never blended/hidden).
 */
import type { ReactNode } from 'react'
import type { TruthLabel } from '@/lib/fantasy-os/exec-intelligence/truth'
import type { Explanation, EvidenceItem, ConfidenceLevel } from '@/lib/fantasy-os/exec-intelligence/explanation'

export function fmt(n: number): string {
  return n.toLocaleString('en-US')
}

const TRUTH_CLASS: Record<TruthLabel, string> = {
  'Live League Data': 'border-status-success/30 bg-status-success/10 text-status-success',
  'Derived League Intelligence': 'border-brand-primary/30 bg-brand-primary/[0.08] text-brand-primary',
  'Presentation Preview': 'border-status-warning/30 bg-status-warning/10 text-status-warning',
  'Insufficient Evidence': 'border-subtle bg-surface-muted text-muted',
}

export function TruthLabelBadge({ label, className = '' }: { label: TruthLabel; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${TRUTH_CLASS[label]} ${className}`}
      data-truth-label={label}
    >
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
      {label}
    </span>
  )
}

const CONF_CLASS: Record<ConfidenceLevel, string> = {
  High: 'border-status-success/30 bg-status-success/10 text-status-success',
  Medium: 'border-status-warning/30 bg-status-warning/10 text-status-warning',
  Low: 'border-subtle bg-surface-muted text-muted',
}

export function ConfidenceBadge({ level, rationale }: { level: ConfidenceLevel; rationale?: string }) {
  return (
    <span
      title={rationale}
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${CONF_CLASS[level]}`}
    >
      {level} confidence
    </span>
  )
}

export function DataFreshness({ importedAt, window }: { importedAt: string; window: string }) {
  const imported = safeDate(importedAt)
  return (
    <p className="text-[11px] text-muted">
      <span className="font-semibold text-secondary">Source window:</span> {window} ·{' '}
      <span className="font-semibold text-secondary">Imported:</span> {imported}
    </p>
  )
}

export function SourceWindowNotice({ window, limitation }: { window: string; limitation?: string }) {
  return (
    <div className="rounded-lg border border-subtle bg-surface-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted">
      <span className="font-semibold text-secondary">Source window {window}.</span>{' '}
      {limitation ?? 'Metrics reflect the certified non-production league portfolio.'}
    </div>
  )
}

export function WorkspaceSectionHeader({ eyebrow, title, subtitle, right }: { eyebrow?: string; title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow ? <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{eyebrow}</p> : null}
        <h2 className="text-lg font-black tracking-tight text-primary">{title}</h2>
        {subtitle ? <p className="mt-0.5 text-[13px] leading-relaxed text-secondary">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}

export function MetricDefinitionTooltip({ label, definition }: { label: string; definition: string }) {
  return (
    <span title={definition} className="cursor-help border-b border-dotted border-line-strong text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
      {label}
    </span>
  )
}

export function ExecutiveKpiCard({ label, value, sub, truthLabel, definition }: { label: string; value: string; sub?: string; truthLabel: TruthLabel; definition?: string }) {
  return (
    <div className="card-premium flex flex-col gap-1.5 p-4" data-testid="exec-kpi-card">
      <div className="flex items-start justify-between gap-2">
        {definition ? <MetricDefinitionTooltip label={label} definition={definition} /> : <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{label}</span>}
      </div>
      <span className="text-2xl font-black tracking-tight text-primary tabular-nums">{value}</span>
      <div className="flex flex-wrap items-center gap-2">
        {sub ? <span className="text-[11px] text-secondary">{sub}</span> : null}
        <TruthLabelBadge label={truthLabel} />
      </div>
    </div>
  )
}

export function ExecutiveKpiRow({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{children}</div>
}

export function EvidenceList({ items }: { items: EvidenceItem[] }) {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Evidence">
      {items.map((e, i) => (
        <li key={i} className="inline-flex items-center gap-1.5 rounded-md border border-subtle bg-surface-muted/60 px-2 py-1 text-[11px]">
          <span className="font-mono font-semibold text-secondary">{e.metric}</span>
          <span className="font-bold text-primary tabular-nums">{typeof e.value === 'number' ? fmt(e.value) : e.value}</span>
          {e.detail ? <span className="text-muted">· {e.detail}</span> : null}
        </li>
      ))}
    </ul>
  )
}

export function InsufficientEvidenceState({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-xl border border-dashed border-subtle bg-surface-muted/40 p-4">
      <TruthLabelBadge label="Insufficient Evidence" />
      <p className="text-[13px] font-semibold text-secondary">{title}</p>
      <p className="text-[12px] leading-relaxed text-muted">{reason}</p>
    </div>
  )
}

export function ExecutiveInsightPanel({ insight }: { insight: Explanation }) {
  return (
    <div className="card-premium flex flex-col gap-3 p-4" data-testid="exec-insight-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <TruthLabelBadge label={insight.truthLabel} />
        <ConfidenceBadge level={insight.confidence.level} rationale={insight.confidence.rationale} />
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">What happened</p>
        <p className="text-[14px] font-semibold leading-snug text-primary">{insight.whatHappened}</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Evidence</p>
        <EvidenceList items={insight.evidence} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Why it matters</p>
          <p className="mt-1 text-[12px] leading-relaxed text-secondary">{insight.whyItMatters}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Recommended action</p>
          <p className="mt-1 text-[12px] leading-relaxed text-secondary">{insight.recommendation}</p>
        </div>
      </div>
      {insight.limitations?.length ? (
        <p className="border-t border-subtle pt-2 text-[11px] leading-relaxed text-muted">
          <span className="font-semibold">Limitations:</span> {insight.limitations.join(' ')}
        </p>
      ) : null}
    </div>
  )
}

function safeDate(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toISOString().slice(0, 10)
}

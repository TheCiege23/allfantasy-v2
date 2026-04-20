'use client'

export type CanonicalPreview = {
  inferredConcept: string
  inferredLeagueType: string
  scoringPresetId: string
  draftType: string
  presetKey: string | null
  derivedFlags?: {
    idp: boolean
    salaryCap: boolean
    devy: boolean
    c2c: boolean
    bestBall: boolean
    dynasty: boolean
    tournament: boolean
  }
  importMetadata?: {
    importSource: string
    externalLeagueId: string
    normalizationVersion?: string
  }
  reviewRequired: boolean
  reviewReasons: string[]
  warnings: Array<{ code: string; message: string; severity: string }>
  meta: { provider: string; sourceLeagueId: string; confidence: Record<string, number> }
}

function flagLabel(active: boolean, label: string) {
  return (
    <span className={active ? 'text-cyan-200/95' : 'text-white/25'}>
      {label}
      {active ? ' ✓' : ''}
    </span>
  )
}

export default function CanonicalImportSummaryCard({ canonical }: { canonical: CanonicalPreview | null }) {
  if (!canonical) return null

  const df = canonical.derivedFlags

  return (
    <div
      className="rounded-xl border border-cyan-400/15 bg-[#0a1228]/90 px-4 py-3 text-[13px] text-white/90"
      data-testid="canonical-import-summary"
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200/80">
        AllFantasy canonical mapping
      </p>
      <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <dt className="text-white/45">Concept</dt>
        <dd className="text-right font-medium">{canonical.inferredConcept}</dd>
        <dt className="text-white/45">Sport format</dt>
        <dd className="text-right font-medium">{canonical.inferredLeagueType}</dd>
        <dt className="text-white/45">Scoring preset</dt>
        <dd className="text-right font-medium">{canonical.scoringPresetId}</dd>
        <dt className="text-white/45">Draft</dt>
        <dd className="text-right font-medium">{canonical.draftType}</dd>
        <dt className="text-white/45">Preset key</dt>
        <dd className="truncate text-right text-[12px] text-white/65" title={canonical.presetKey ?? ''}>
          {canonical.presetKey ?? '—'}
        </dd>
      </dl>
      {canonical.importMetadata ? (
        <p className="mt-2 text-[11px] text-white/40">
          Source {canonical.importMetadata.importSource} · External ID {canonical.importMetadata.externalLeagueId}
          {canonical.importMetadata.normalizationVersion ? ` · norm v${canonical.importMetadata.normalizationVersion}` : ''}
        </p>
      ) : null}
      {df ? (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/50">
          {flagLabel(df.idp, 'IDP')}
          {flagLabel(df.salaryCap, 'Salary cap')}
          {flagLabel(df.devy, 'Devy')}
          {flagLabel(df.c2c, 'C2C')}
          {flagLabel(df.bestBall, 'Best ball')}
          {flagLabel(df.dynasty, 'Dynasty')}
          {flagLabel(df.tournament, 'Tournament')}
        </div>
      ) : null}
      {canonical.reviewRequired ? (
        <p className="mt-2 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2 py-1.5 text-[12px] text-amber-100/90">
          Review suggested: {canonical.reviewReasons.join(', ')}
        </p>
      ) : null}
      {canonical.warnings.length > 0 ? (
        <ul className="mt-2 space-y-1 text-[12px] text-white/55">
          {canonical.warnings.slice(0, 8).map((w) => (
            <li key={w.code}>
              <span className="text-white/35">[{w.severity}]</span> {w.message}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

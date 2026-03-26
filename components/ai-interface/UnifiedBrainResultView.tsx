'use client'

import React, { useState } from 'react'
import DeterministicEvidenceCard from './DeterministicEvidenceCard'
import AIVerdictCard from './AIVerdictCard'
import ActionPlanCard from './ActionPlanCard'
import ConfidenceDisplay from './ConfidenceDisplay'
import CompareProvidersView from './CompareProvidersView'
import { AIEvidencePresentation } from '@/components/ai-evidence'
import type { ConfidenceLabel } from './ConfidenceDisplay'
import type { NormalizedToolOutput } from '@/lib/ai-context-envelope'

export interface UnifiedBrainResultViewProps {
  primaryAnswer: string
  verdict?: string
  keyEvidence?: string[]
  risksCaveats?: string[]
  suggestedNextAction?: string
  alternatePath?: string
  confidencePct?: number
  confidenceLabel?: ConfidenceLabel
  confidenceReason?: string
  deterministicPayload?: Record<string, unknown> | null
  modelOutputs?: { model: string; raw: string; error?: string; skipped?: boolean }[]
  factGuardWarnings?: string[]
  /** When set, evidence/uncertainty/missing/caveats render from normalized envelope layer */
  normalizedOutput?: NormalizedToolOutput | null
  /** Expand "Sources" (keyEvidence) by default on desktop */
  defaultSourcesExpanded?: boolean
  className?: string
}

/**
 * Unified brain merged result: deterministic facts + synthesis + action + confidence + sources + compare.
 */
export default function UnifiedBrainResultView({
  primaryAnswer,
  verdict,
  keyEvidence,
  risksCaveats,
  suggestedNextAction,
  alternatePath,
  confidencePct,
  confidenceLabel,
  confidenceReason,
  deterministicPayload,
  modelOutputs = [],
  factGuardWarnings,
  normalizedOutput,
  defaultSourcesExpanded = false,
  className = '',
}: UnifiedBrainResultViewProps) {
  const [sourcesExpanded, setSourcesExpanded] = useState(defaultSourcesExpanded)
  const useNormalized = normalizedOutput && (normalizedOutput.evidence?.length || normalizedOutput.uncertainty?.length || normalizedOutput.missingData?.length || normalizedOutput.caveats?.length)

  const hasSources = Array.isArray(keyEvidence) && keyEvidence.length > 0

  return (
    <div className={`space-y-4 ${className}`}>
      {useNormalized ? (
        <AIEvidencePresentation
          output={normalizedOutput}
          showConfidence={true}
          toolId={normalizedOutput.trace?.toolId}
        />
      ) : (
        <>
          {deterministicPayload && Object.keys(deterministicPayload).length > 0 && (
            <DeterministicEvidenceCard
              evidence={deterministicPayload}
              defaultExpanded={true}
            />
          )}
          <div className="flex flex-wrap items-center gap-3">
            <ConfidenceDisplay
              confidencePct={confidencePct}
              confidenceLabel={confidenceLabel}
              reason={confidenceReason}
            />
            {factGuardWarnings && factGuardWarnings.length > 0 && (
              <span className="text-xs text-amber-300/80">
                {factGuardWarnings.length} quality note{factGuardWarnings.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {hasSources && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden">
              <button
                type="button"
                onClick={() => setSourcesExpanded(!sourcesExpanded)}
                data-testid="ai-sources-toggle-button"
                className="flex w-full items-center justify-between gap-2 p-3 text-left hover:bg-white/[0.04] min-h-[44px]"
                aria-expanded={sourcesExpanded}
              >
                <span className="text-sm font-medium text-white/90">Sources</span>
                <span className="text-xs text-white/50">{sourcesExpanded ? 'Hide' : 'Show'}</span>
              </button>
              {sourcesExpanded && (
                <ul className="border-t border-white/10 p-3 space-y-1 list-disc list-inside text-sm text-white/70">
                  {keyEvidence!.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
          {risksCaveats && risksCaveats.length > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs font-medium text-amber-200/90 mb-1">Caveats</p>
              <ul className="text-xs text-amber-200/80 space-y-0.5 list-disc list-inside">
                {risksCaveats.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <AIVerdictCard primaryAnswer={primaryAnswer} verdict={verdict ?? normalizedOutput?.verdict} />

      {(suggestedNextAction ?? normalizedOutput?.suggestedNextAction) && (
        <ActionPlanCard
          suggestedNextAction={suggestedNextAction ?? normalizedOutput?.suggestedNextAction ?? ''}
          alternatePath={alternatePath ?? normalizedOutput?.alternatePath}
        />
      )}

      <CompareProvidersView modelOutputs={modelOutputs} />
    </div>
  )
}

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { SUPPORTED_SPORTS } from '@/lib/sport-scope'
import { getAIToolRegistry } from '@/lib/ai-tool-registry'
import {
  AILoadingSkeleton,
  AIErrorFallback,
  AIProviderSelector,
  AIModeSelector,
  UnifiedBrainResultView,
} from '@/components/ai-interface'
import type { AIMode } from '@/components/ai-interface'
import { getChimmyChatHrefWithPrompt } from '@/lib/ai-product-layer/UnifiedChimmyEntryResolver'
import AIFailureStateRenderer from '@/components/ai-reliability/AIFailureStateRenderer'
import type { ReliabilityMetadata } from '@/lib/ai-reliability/types'

type ProviderResult = {
  provider: string
  raw: string
  error?: string | null
  skipped?: boolean
  latencyMs?: number
}

type ProviderStatusItem = {
  provider: string
  status: 'ok' | 'failed' | 'timeout' | 'invalid_response'
  error?: string
  latencyMs?: number
}

type ReliabilityDisagreement = {
  hasDisagreement: boolean
  explanation: string
  primaryVerdict: string
  primaryConfidence: number
  alternateVerdicts: Array<{ verdict: string; confidence: number; provider: string }>
}

type ReliabilityMeta = {
  usedDeterministicFallback: boolean
  message?: string
  fallbackExplanation?: string
  dataQualityWarnings?: string[]
  hardViolation?: boolean
  confidence?: number
  confidenceSource?: 'deterministic' | 'llm' | 'capped'
  partialProviderFailure?: boolean
  disagreement?: ReliabilityDisagreement
  providerStatus?: ProviderStatusItem[]
}

type AlternateOutput = {
  provider: string
  text: string
}

type UnifiedRunResponse = {
  evidence: string[]
  aiExplanation: string
  actionPlan?: string | null
  confidence?: number | null
  confidenceLabel?: 'low' | 'medium' | 'high' | null
  confidenceReason?: string | null
  uncertainty?: string | null
  providerResults: ProviderResult[]
  usedDeterministicFallback?: boolean
  reliability?: ReliabilityMeta | null
  factGuardWarnings?: string[]
  alternateOutputs?: AlternateOutput[]
}

const SPORT_LABELS: Record<string, string> = {
  NFL: 'NFL',
  NHL: 'NHL',
  NBA: 'NBA',
  MLB: 'MLB',
  NCAAB: 'NCAA Basketball',
  NCAAF: 'NCAA Football',
  SOCCER: 'Soccer',
}

const WORKBENCH_TOOL_KEYS = [
  'chimmy_chat',
  'trade_analyzer',
  'waiver_ai',
  'draft_helper',
  'rankings',
  'psychological',
  'story_creator',
] as const

const QUICK_CHIPS = [
  { id: 'trade', label: 'Explain this trade', prompt: 'Explain this trade using fairness and acceptance context.' },
  { id: 'waiver', label: 'Waiver plan', prompt: 'Give me a waiver action plan with FAAB priorities.' },
  { id: 'draft', label: 'Draft pick help', prompt: 'Who should I draft next and why?' },
  { id: 'risk', label: 'Confidence check', prompt: 'What is uncertain in this recommendation and why?' },
]

const ENTRY_BUTTONS = [
  { id: 'ask-ai', label: 'Ask AI', tool: 'chimmy_chat', prompt: 'Help me with my next best move.' },
  { id: 'explain-trade', label: 'Explain Trade', tool: 'trade_analyzer', prompt: 'Explain this trade from both sides.' },
  { id: 'waiver', label: 'AI Waiver', tool: 'waiver_ai', prompt: 'What waiver move gives me the best edge this week?' },
  { id: 'draft', label: 'AI Draft Helper', tool: 'draft_helper', prompt: "I'm on the clock. Give me the best pick and two pivots." },
  { id: 'rankings', label: 'Rankings Explanation', tool: 'rankings', prompt: 'Explain these rankings with evidence and caveats.' },
  { id: 'psychological', label: 'Psychological Profile', tool: 'psychological', prompt: 'Explain this manager profile with evidence.' },
  { id: 'story', label: 'Story Creator', tool: 'story_creator', prompt: 'Create a concise rivalry storyline with facts only.' },
] as const

function getDeterministicContext(tool: string, sport: string): Record<string, unknown> | null {
  switch (tool) {
    case 'trade_analyzer':
      return {
        fairnessScore: 53,
        valueDelta: 112,
        sideATotalValue: 8475,
        sideBTotalValue: 8363,
        sport,
      }
    case 'waiver_ai':
      return {
        candidates: [
          { player: 'Example Add 1', priorityScore: 81 },
          { player: 'Example Add 2', priorityScore: 75 },
        ],
        leagueSettings: { waiverType: 'FAAB', teams: 12, scoring: 'ppr' },
      }
    case 'draft_helper':
      return {
        board: [
          { name: 'Best Available 1', tier: 2, adp: 48 },
          { name: 'Best Available 2', tier: 2, adp: 52 },
        ],
        roster: { qb: 1, rb: 2, wr: 3, te: 1, flex: 1 },
        scoring: { format: 'ppr', superflex: false },
      }
    case 'rankings':
      return {
        ordering: ['Team Alpha', 'Team Beta', 'Team Gamma'],
        tiers: {
          tier1: ['Team Alpha'],
          tier2: ['Team Beta', 'Team Gamma'],
        },
      }
    case 'psychological':
      return {
        profile: { style: 'aggressive', risk: 'high' },
        evidence: ['Trade frequency above league median', 'FAAB velocity elevated'],
      }
    case 'story_creator':
      return {
        leagueSummary: 'Two contenders tied for first heading into playoffs.',
        facts: ['Rivalry series tied 4-4', 'Average margin 3.2 points'],
      }
    default:
      return null
  }
}

function buildLeagueSettings(sport: string): Record<string, unknown> {
  return {
    sport,
    format: 'dynasty',
    scoring: 'ppr',
    teams: 12,
    roster: '1QB 2RB 3WR 1TE 1FLEX',
  }
}

export default function UnifiedAIWorkbench() {
  const registry = useMemo(
    () =>
      getAIToolRegistry().filter((tool) =>
        WORKBENCH_TOOL_KEYS.includes(tool.toolKey as (typeof WORKBENCH_TOOL_KEYS)[number])
      ),
    []
  )
  const [sport, setSport] = useState<string>('NFL')
  const [selectedTool, setSelectedTool] = useState<string>('chimmy_chat')
  const [mode, setMode] = useState<AIMode>('unified_brain')
  const [prompt, setPrompt] = useState<string>('Help me make the best evidence-based move.')
  const [result, setResult] = useState<UnifiedRunResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [expandedExplanation, setExpandedExplanation] = useState(false)
  const [mobileResultOpen, setMobileResultOpen] = useState(false)
  const [lastAction, setLastAction] = useState<'run' | 'compare'>('run')
  const [selectedAlternateProvider, setSelectedAlternateProvider] = useState<string | null>(null)

  const selectedToolRegistration =
    registry.find((tool) => tool.toolKey === selectedTool) ?? registry[0] ?? null
  const allowedModes = selectedToolRegistration?.supportedModes ?? ['unified_brain']
  const modelOutputs = result?.providerResults?.map((item) => ({
    model: item.provider as 'openai' | 'deepseek' | 'grok',
    raw: item.raw,
    error: item.error ?? undefined,
    skipped: item.skipped ?? false,
  }))
  const activeAlternate = result?.alternateOutputs?.find((output) => output.provider === selectedAlternateProvider) ?? null
  const activeExplanation = activeAlternate?.text ?? result?.aiExplanation ?? ''
  const reliabilityForRenderer = useMemo<ReliabilityMetadata | null>(() => {
    if (!result?.reliability) return null
    return {
      confidence:
        typeof result.reliability.confidence === 'number'
          ? result.reliability.confidence
          : typeof result.confidence === 'number'
            ? result.confidence
            : 0,
      usedDeterministicFallback:
        result.reliability.usedDeterministicFallback ?? Boolean(result.usedDeterministicFallback),
      providerResults: (result.reliability.providerStatus ?? []).map((provider) => ({
        provider: provider.provider,
        status: provider.status,
        error: provider.error,
        latencyMs: provider.latencyMs,
      })),
      fallbackExplanation: result.reliability.fallbackExplanation ?? result.reliability.message,
      dataQualityWarnings: result.reliability.dataQualityWarnings ?? result.factGuardWarnings ?? [],
      hardViolation: Boolean(result.reliability.hardViolation),
    }
  }, [result])

  const runRequest = async (action: 'run' | 'compare') => {
    setLoading(true)
    setError(null)
    setLastAction(action)
    setSelectedAlternateProvider(null)
    if (!prompt.trim()) {
      setLoading(false)
      setError('Enter a prompt before running AI.')
      return
    }

    const endpoint = action === 'compare' ? '/api/ai/compare' : '/api/ai/run'
    const body = {
      tool: selectedTool,
      sport,
      leagueId: 'ai-workbench-league',
      leagueSettings: buildLeagueSettings(sport),
      deterministicContext: getDeterministicContext(selectedTool, sport),
      aiMode: action === 'compare' ? 'consensus' : mode,
      userMessage: prompt.trim(),
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null
      if (!response.ok) {
        const serverError =
          (typeof data?.userMessage === 'string' && data.userMessage) ||
          (typeof data?.message === 'string' && data.message) ||
          'AI request failed.'
        setError(serverError)
        setResult(null)
        return
      }

      const parsed: UnifiedRunResponse = {
        evidence: Array.isArray(data?.evidence)
          ? data.evidence.filter((item): item is string => typeof item === 'string')
          : [],
        aiExplanation: typeof data?.aiExplanation === 'string' ? data.aiExplanation : '',
        actionPlan: typeof data?.actionPlan === 'string' ? data.actionPlan : null,
        confidence: typeof data?.confidence === 'number' ? data.confidence : null,
        confidenceLabel:
          data?.confidenceLabel === 'low' || data?.confidenceLabel === 'medium' || data?.confidenceLabel === 'high'
            ? data.confidenceLabel
            : null,
        confidenceReason: typeof data?.confidenceReason === 'string' ? data.confidenceReason : null,
        uncertainty: typeof data?.uncertainty === 'string' ? data.uncertainty : null,
        providerResults: Array.isArray(data?.providerResults)
          ? (data.providerResults as ProviderResult[])
          : [],
        usedDeterministicFallback: Boolean(data?.usedDeterministicFallback),
        reliability:
          data?.reliability && typeof data.reliability === 'object'
            ? (data.reliability as ReliabilityMeta)
            : null,
        factGuardWarnings: Array.isArray(data?.factGuardWarnings)
          ? data.factGuardWarnings.filter((item): item is string => typeof item === 'string')
          : [],
        alternateOutputs: Array.isArray(data?.alternateOutputs)
          ? data.alternateOutputs.filter(
              (item): item is AlternateOutput =>
                Boolean(item) &&
                typeof item === 'object' &&
                typeof (item as AlternateOutput).provider === 'string' &&
                typeof (item as AlternateOutput).text === 'string'
            )
          : [],
      }

      setResult(parsed)
      setSelectedAlternateProvider(null)
      setExpandedExplanation(false)
      setMobileResultOpen(true)
    } catch {
      setError('Network error while running AI. Please retry.')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!activeExplanation) return
    try {
      await navigator.clipboard.writeText(activeExplanation)
      toast.success('AI explanation copied.')
    } catch {
      toast.error('Unable to copy response.')
    }
  }

  const displayedExplanation = useMemo(() => {
    if (!activeExplanation) return ''
    if (expandedExplanation || activeExplanation.length <= 380) return activeExplanation
    return `${activeExplanation.slice(0, 380)}...`
  }, [activeExplanation, expandedExplanation])
  const shouldShowReliabilityBanner = Boolean(
    reliabilityForRenderer &&
      (
        reliabilityForRenderer.usedDeterministicFallback ||
        reliabilityForRenderer.providerResults.some((provider) => provider.status !== 'ok') ||
        (reliabilityForRenderer.dataQualityWarnings?.length ?? 0) > 0 ||
        Boolean(result?.reliability?.disagreement?.hasDisagreement)
      )
  )

  return (
    <section
      className="mb-8 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5"
      data-testid="unified-ai-workbench"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-white">Unified AI Interface</h2>
          <p className="text-xs text-white/55">
            Deterministic-first orchestration across tools, with mode control, comparison, and confidence-aware output.
          </p>
        </div>
        <Link
          href="/messages?tab=ai"
          data-testid="unified-ai-chat-open-button"
          className="rounded-lg border border-white/20 bg-white/[0.03] px-3 py-1.5 text-xs text-white/80 hover:bg-white/10"
        >
          Open AI Chat
        </Link>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {ENTRY_BUTTONS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            data-testid={`unified-ai-entry-${entry.id}-button`}
            onClick={() => {
              setSelectedTool(entry.tool)
              setPrompt(entry.prompt)
              setResult(null)
              setError(null)
              setSelectedAlternateProvider(null)
            }}
            className="rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-white/80 hover:bg-white/10"
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs text-white/60">
          Sport
          <select
            value={sport}
            onChange={(event) => setSport(event.target.value)}
            data-testid="unified-ai-sport-selector"
            className="mt-1 min-h-[40px] w-full rounded-lg border border-white/20 bg-white/[0.04] px-3 py-2 text-sm text-white"
          >
            {SUPPORTED_SPORTS.map((supportedSport) => (
              <option key={supportedSport} value={supportedSport}>
                {SPORT_LABELS[supportedSport] ?? supportedSport}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs text-white/60">
          Tool
          <select
            value={selectedTool}
            onChange={(event) => {
              setSelectedTool(event.target.value)
              setResult(null)
              setError(null)
              setSelectedAlternateProvider(null)
            }}
            data-testid="unified-ai-tool-selector"
            className="mt-1 min-h-[40px] w-full rounded-lg border border-white/20 bg-white/[0.04] px-3 py-2 text-sm text-white"
          >
            {registry.map((tool) => (
              <option key={tool.toolKey} value={tool.toolKey}>
                {tool.toolName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3">
        <AIModeSelector
          value={mode}
          onChange={setMode}
          allowedModes={allowedModes}
          className="mb-2"
        />

        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          data-testid="unified-ai-prompt-input"
          placeholder="Explain the decision with evidence and confidence."
          className="min-h-[88px] w-full rounded-lg border border-white/20 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/40"
        />

        <div className="mt-2 flex flex-wrap gap-2">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              data-testid={`unified-ai-quick-chip-${chip.id}`}
              onClick={() => setPrompt(chip.prompt)}
              className="rounded-full border border-white/20 bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/75 hover:bg-white/10"
            >
              {chip.label}
            </button>
          ))}
          <Link
            href={getChimmyChatHrefWithPrompt(prompt)}
            data-testid="unified-ai-open-chimmy-with-prompt-link"
            className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-200 hover:bg-cyan-500/20"
          >
            Open in Chimmy
          </Link>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void runRequest('run')}
          data-testid="unified-ai-run-button"
          disabled={loading}
          className="rounded-lg bg-cyan-500/20 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-500/30 disabled:opacity-60"
        >
          Run AI
        </button>
        <button
          type="button"
          onClick={() => void runRequest('compare')}
          data-testid="unified-ai-compare-button"
          disabled={loading}
          className="rounded-lg border border-white/20 bg-white/[0.03] px-3 py-2 text-sm text-white/85 hover:bg-white/10 disabled:opacity-60"
        >
          Compare providers
        </button>
        <button
          type="button"
          onClick={() => void runRequest(lastAction)}
          data-testid="unified-ai-regenerate-button"
          disabled={loading || (!result && !error)}
          className="rounded-lg border border-white/20 bg-white/[0.03] px-3 py-2 text-sm text-white/75 hover:bg-white/10 disabled:opacity-50"
        >
          Regenerate
        </button>
        <button
          type="button"
          onClick={handleCopy}
          data-testid="unified-ai-copy-button"
          disabled={!activeExplanation}
          className="rounded-lg border border-white/20 bg-white/[0.03] px-3 py-2 text-sm text-white/75 hover:bg-white/10 disabled:opacity-50"
        >
          Copy
        </button>
        <button
          type="button"
          onClick={() => {
            setPrompt('')
            setResult(null)
            setError(null)
            setSelectedAlternateProvider(null)
          }}
          data-testid="unified-ai-back-button"
          className="rounded-lg border border-white/20 bg-white/[0.03] px-3 py-2 text-sm text-white/75 hover:bg-white/10"
        >
          Back
        </button>
      </div>

      <AIProviderSelector
        className="mt-3"
        canCompare={Boolean(result?.providerResults?.length && result.providerResults.length > 1)}
        onCompareClick={() => void runRequest('compare')}
      />

      <button
        type="button"
        data-testid="unified-ai-mobile-drawer-open-button"
        onClick={() => setMobileResultOpen(true)}
        className="mt-3 rounded-lg border border-white/20 bg-white/[0.03] px-3 py-2 text-xs text-white/75 hover:bg-white/10 sm:hidden"
      >
        Open result drawer
      </button>

      <div className="mt-4 hidden sm:block">
        {loading && (
          <div data-testid="unified-ai-loading-state">
            <AILoadingSkeleton />
          </div>
        )}

        {!loading && error && (
          <div data-testid="unified-ai-error-state">
            <AIErrorFallback
              message={error}
              onRetry={() => void runRequest(lastAction)}
              retryLoading={loading}
              usedDeterministicFallback={Boolean(result?.usedDeterministicFallback)}
              reliability={reliabilityForRenderer}
              confidence={typeof result?.confidence === 'number' ? result.confidence : undefined}
            />
          </div>
        )}

        {!loading && !error && result && (
          <div className="space-y-3" data-testid="unified-ai-result-panel">
            {shouldShowReliabilityBanner && (
              <AIFailureStateRenderer
                usedDeterministicFallback={Boolean(result.usedDeterministicFallback)}
                fallbackExplanation={
                  result.reliability?.fallbackExplanation ??
                  result.reliability?.message ??
                  (result.usedDeterministicFallback
                    ? 'AI providers are temporarily unavailable. Showing deterministic output.'
                    : undefined)
                }
                reliability={reliabilityForRenderer}
                confidence={typeof result.confidence === 'number' ? result.confidence : undefined}
                onRetry={() => void runRequest(lastAction)}
                retryLoading={loading}
              />
            )}
            <div className="rounded-lg border border-white/10 bg-black/20 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-white/70">AI explanation</span>
                <button
                  type="button"
                  data-testid="unified-ai-explanation-toggle-button"
                  onClick={() => setExpandedExplanation((current) => !current)}
                  className="rounded-md border border-white/15 bg-white/[0.03] px-2 py-1 text-[11px] text-white/70 hover:bg-white/10"
                >
                  {expandedExplanation ? 'Collapse' : 'Expand'}
                </button>
              </div>
              {Array.isArray(result.alternateOutputs) && result.alternateOutputs.length > 0 && (
                <div
                  className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-white/10 bg-white/[0.03] p-2"
                  data-testid="unified-ai-alternate-output-panel"
                >
                  <button
                    type="button"
                    data-testid="unified-ai-alternate-output-primary-button"
                    onClick={() => setSelectedAlternateProvider(null)}
                    className={`rounded-md border px-2 py-1 text-[11px] ${
                      selectedAlternateProvider == null
                        ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
                        : 'border-white/15 bg-white/[0.02] text-white/70'
                    }`}
                  >
                    Primary output
                  </button>
                  {result.alternateOutputs.map((alt) => (
                    <button
                      key={alt.provider}
                      type="button"
                      data-testid={`unified-ai-alternate-output-${alt.provider}-button`}
                      onClick={() => setSelectedAlternateProvider(alt.provider)}
                      className={`rounded-md border px-2 py-1 text-[11px] ${
                        selectedAlternateProvider === alt.provider
                          ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
                          : 'border-white/15 bg-white/[0.02] text-white/70'
                      }`}
                    >
                      {alt.provider} view
                    </button>
                  ))}
                </div>
              )}
              <p
                className="text-sm text-white/85 whitespace-pre-wrap"
                data-testid="unified-ai-explanation-text"
              >
                {displayedExplanation}
              </p>
              {result.reliability?.disagreement?.hasDisagreement && (
                <p
                  className="mt-2 text-xs text-amber-200/85"
                  data-testid="unified-ai-disagreement-note"
                >
                  {result.reliability.disagreement.explanation}
                </p>
              )}
            </div>

            <UnifiedBrainResultView
              primaryAnswer={activeExplanation || result.aiExplanation}
              keyEvidence={result.evidence}
              suggestedNextAction={result.actionPlan ?? undefined}
              confidencePct={result.confidence ?? undefined}
              confidenceLabel={result.confidenceLabel ?? undefined}
              confidenceReason={result.confidenceReason ?? undefined}
              risksCaveats={result.uncertainty ? [result.uncertainty] : undefined}
              modelOutputs={modelOutputs}
              factGuardWarnings={result.factGuardWarnings}
            />
          </div>
        )}
      </div>

      {!loading && error && (
        <div className="mt-4 sm:hidden" data-testid="unified-ai-mobile-error-state">
          <AIErrorFallback
            message={error}
            onRetry={() => void runRequest(lastAction)}
            retryLoading={loading}
            usedDeterministicFallback={Boolean(result?.usedDeterministicFallback)}
            reliability={reliabilityForRenderer}
            confidence={typeof result?.confidence === 'number' ? result.confidence : undefined}
          />
        </div>
      )}

      {mobileResultOpen && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto border border-white/15 bg-[#090f1f] p-4 shadow-2xl sm:hidden"
          data-testid="unified-ai-mobile-drawer"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">AI result</h3>
            <button
              type="button"
              data-testid="unified-ai-mobile-drawer-close-button"
              onClick={() => setMobileResultOpen(false)}
              className="rounded-md border border-white/20 bg-white/[0.03] px-2 py-1 text-xs text-white/75"
            >
              Close
            </button>
          </div>
          {loading ? (
            <div data-testid="unified-ai-mobile-loading-state">
              <AILoadingSkeleton />
            </div>
          ) : error ? (
            <div data-testid="unified-ai-mobile-drawer-error-state">
              <AIErrorFallback
                message={error}
                onRetry={() => void runRequest(lastAction)}
                retryLoading={loading}
                usedDeterministicFallback={Boolean(result?.usedDeterministicFallback)}
                reliability={reliabilityForRenderer}
                confidence={typeof result?.confidence === 'number' ? result.confidence : undefined}
              />
            </div>
          ) : result ? (
            <div className="space-y-3">
              {shouldShowReliabilityBanner && (
                <AIFailureStateRenderer
                  usedDeterministicFallback={Boolean(result.usedDeterministicFallback)}
                  fallbackExplanation={
                    result.reliability?.fallbackExplanation ??
                    result.reliability?.message ??
                    (result.usedDeterministicFallback
                      ? 'AI providers are temporarily unavailable. Showing deterministic output.'
                      : undefined)
                  }
                  reliability={reliabilityForRenderer}
                  confidence={typeof result.confidence === 'number' ? result.confidence : undefined}
                  onRetry={() => void runRequest(lastAction)}
                  retryLoading={loading}
                />
              )}
              <UnifiedBrainResultView
                primaryAnswer={activeExplanation || result.aiExplanation}
                keyEvidence={result.evidence}
                suggestedNextAction={result.actionPlan ?? undefined}
                confidencePct={result.confidence ?? undefined}
                confidenceLabel={result.confidenceLabel ?? undefined}
                confidenceReason={result.confidenceReason ?? undefined}
                risksCaveats={result.uncertainty ? [result.uncertainty] : undefined}
                modelOutputs={modelOutputs}
                factGuardWarnings={result.factGuardWarnings}
              />
            </div>
          ) : (
            <p className="text-xs text-white/60">Run AI to view a result.</p>
          )}
        </div>
      )}
    </section>
  )
}

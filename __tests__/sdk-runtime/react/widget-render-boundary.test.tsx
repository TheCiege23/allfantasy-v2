import { describe, expect, it } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WidgetRenderBoundary } from '../../../sdk-runtime/react/src/WidgetRenderBoundary'
import type { UseAllFantasyWidgetResult, WidgetPresentationData } from '../../../sdk-runtime/react/src/types'
import type { SDKError, SDKLifecycleState } from '../../../lib/decision-os/sdk/types'

function makeData(overrides: Partial<WidgetPresentationData> = {}): WidgetPresentationData {
  return {
    entityId: 'league_001',
    entityType: 'league',
    healthScore: 82,
    healthSeverity: { token: 'positive', priority: 5, displayColorToken: 'success', iconToken: 'check', animationToken: 'none' },
    archetype: 'balanced_league',
    archetypeLabel: 'Balanced League',
    retentionRisk: 'low',
    engagementTier: 'active',
    badges: [{ id: 'badge_1', catalogId: 'top_10_pct', label: 'Top 10%', description: 'desc', colorToken: 'success', iconToken: 'star', tier: 'league', derivation: [] }],
    topRecommendations: [{
      recommendationId: 'rec_1', tier: 'commissioner', category: 'engagement', entityId: 'league_001',
      priority: 'high',
      severity: { token: 'elevated', priority: 2, displayColorToken: 'warning', iconToken: 'alert_triangle', animationToken: 'none' },
      colorToken: 'warning', iconToken: 'zap', title: 'Boost Activity', description: 'Encourage trades this week.',
      expectedImpact: 'x', difficulty: 'easy', estimatedTime: '5_min', supportingEvidence: [], actions: [],
      rollbackCriteria: [], prerequisites: [], completionStatus: 'pending', relatedGraph: null, relatedKpi: null,
      benchmarkContext: null, uncertainty: [], derivation: [], completeness: 90,
    }],
    metrics: [{
      metricId: 'metric_1', label: 'Engagement', displayValue: '95%', numericValue: 95,
      colorToken: 'success', severityToken: 'positive', trend: null, subtext: null, progressValue: 95,
      derivation: [], completeness: 90,
    }],
    benchmarkSummary: null,
    completeness: 100,
    version: '7.0.0',
    ...overrides,
  } as WidgetPresentationData
}

function makeResult(overrides: Partial<UseAllFantasyWidgetResult> = {}): UseAllFantasyWidgetResult {
  return {
    renderState: 'ready',
    lifecycleState: 'ready' as SDKLifecycleState,
    data: makeData(),
    degraded: false,
    error: null,
    refresh: async () => {},
    engine: null,
    ...overrides,
  }
}

function makeError(overrides: Partial<SDKError> = {}): SDKError {
  return {
    code: 'UNAUTHORIZED',
    message: 'The provided credentials are not authorized for this widget.',
    retryable: false,
    widgetId: null,
    timestamp: '2026-07-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('WidgetRenderBoundary — loading', () => {
  it('renders a loading indicator', () => {
    render(<WidgetRenderBoundary result={makeResult({ renderState: 'loading', data: null })} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
})

describe('WidgetRenderBoundary — ready', () => {
  it('renders the health score', () => {
    render(<WidgetRenderBoundary result={makeResult()} />)
    expect(screen.getByText('82')).toBeInTheDocument()
  })

  it('renders badges', () => {
    render(<WidgetRenderBoundary result={makeResult()} />)
    expect(screen.getByText('Top 10%')).toBeInTheDocument()
  })

  it('renders metrics', () => {
    render(<WidgetRenderBoundary result={makeResult()} />)
    expect(screen.getByText('Engagement')).toBeInTheDocument()
  })

  it('renders recommendations', () => {
    render(<WidgetRenderBoundary result={makeResult()} />)
    expect(screen.getByText('Boost Activity')).toBeInTheDocument()
  })

  it('falls back to loading when data is null but renderState is ready (transient)', () => {
    render(<WidgetRenderBoundary result={makeResult({ data: null })} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })

  it('does not render a degraded banner when degraded is false', () => {
    render(<WidgetRenderBoundary result={makeResult({ degraded: false })} />)
    expect(screen.queryByText(/may be incomplete/i)).not.toBeInTheDocument()
  })

  it('renders a degraded banner when degraded is true', () => {
    render(<WidgetRenderBoundary result={makeResult({ degraded: true })} />)
    expect(screen.getByText(/may be incomplete/i)).toBeInTheDocument()
  })

  it('the refresh button calls result.refresh()', () => {
    let called = false
    const result = makeResult({ refresh: async () => { called = true } })
    render(<WidgetRenderBoundary result={result} />)
    fireEvent.click(screen.getByText('Refresh'))
    expect(called).toBe(true)
  })
})

describe('WidgetRenderBoundary — error', () => {
  it('renders the error message', () => {
    const result = makeResult({ renderState: 'error', data: null, error: makeError() })
    render(<WidgetRenderBoundary result={result} />)
    expect(screen.getByText(makeError().message)).toBeInTheDocument()
  })

  it('does not render a retry button for a non-retryable error', () => {
    const result = makeResult({ renderState: 'error', data: null, error: makeError({ retryable: false }) })
    render(<WidgetRenderBoundary result={result} />)
    expect(screen.queryByText('Retry')).not.toBeInTheDocument()
  })

  it('renders a retry button for a retryable error', () => {
    const result = makeResult({ renderState: 'error', data: null, error: makeError({ retryable: true, code: 'NETWORK' }) })
    render(<WidgetRenderBoundary result={result} />)
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })

  it('the retry button calls result.refresh()', () => {
    let called = false
    const result = makeResult({
      renderState: 'error', data: null, error: makeError({ retryable: true, code: 'NETWORK' }),
      refresh: async () => { called = true },
    })
    render(<WidgetRenderBoundary result={result} />)
    fireEvent.click(screen.getByText('Retry'))
    expect(called).toBe(true)
  })
})

describe('WidgetRenderBoundary — offline', () => {
  it('renders an offline message with a retry option', () => {
    const result = makeResult({ renderState: 'offline', data: null, error: makeError({ code: 'NETWORK', retryable: true }) })
    render(<WidgetRenderBoundary result={result} />)
    expect(screen.getByText(/temporarily unavailable/i)).toBeInTheDocument()
    expect(screen.getByText('Retry')).toBeInTheDocument()
  })
})

describe('WidgetRenderBoundary — rate_limited', () => {
  it('renders a rate-limited message', () => {
    const result = makeResult({ renderState: 'rate_limited', data: null, error: makeError({ code: 'RATE_LIMITED', retryable: true }) })
    render(<WidgetRenderBoundary result={result} />)
    expect(screen.getByText(/please wait/i)).toBeInTheDocument()
  })
})

describe('WidgetRenderBoundary — disposed', () => {
  it('renders nothing', () => {
    const { container } = render(<WidgetRenderBoundary result={makeResult({ renderState: 'disposed', data: null })} />)
    expect(container).toBeEmptyDOMElement()
  })
})

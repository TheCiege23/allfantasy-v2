'use client'

/**
 * Decision OS — Phase 7.8 React Adapter: lightweight renderer boundary.
 *
 * Purely presentational — takes an already-resolved `UseAllFantasyWidgetResult`
 * and renders it. Computes NOTHING: colors come from `resolveColorTokenHex`
 * (a token lookup, not a derivation), and every score/label/badge/recommendation
 * rendered here already arrived pre-resolved from the Presentation API.
 *
 * Styling uses inline styles, not Tailwind — this component is meant to be
 * embeddable on a partner site with no CSS framework installed at all.
 */

import type { CSSProperties } from 'react'
import type { WidgetPresentationData, UseAllFantasyWidgetResult } from './types'
import { extractHeadline } from './presentationHelpers'
import { resolveColorTokenHex } from './tokens'

export interface WidgetRenderBoundaryProps {
  result: UseAllFantasyWidgetResult
}

const containerStyle: CSSProperties = {
  fontFamily: 'system-ui, sans-serif',
  color: '#e2e8f0',
  background: 'rgba(15,23,42,0.9)',
  borderRadius: 12,
  padding: 16,
  maxWidth: 360,
}

function Dot({ hex }: { hex: string }) {
  return (
    <span
      style={{
        display: 'inline-block',
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: hex,
        marginRight: 6,
      }}
    />
  )
}

function LoadingState() {
  return (
    <div style={containerStyle} data-widget-state="loading">
      <p style={{ opacity: 0.6, margin: 0 }}>Loading…</p>
    </div>
  )
}

function DisposedState() {
  return null
}

function ErrorLikeState({
  headline,
  message,
  retryable,
  onRetry,
}: {
  headline: string
  message: string
  retryable: boolean
  onRetry: () => void
}) {
  return (
    <div style={containerStyle} data-widget-state="error">
      <p style={{ fontWeight: 600, margin: '0 0 4px 0' }}>{headline}</p>
      <p style={{ opacity: 0.7, margin: '0 0 12px 0', fontSize: 13 }}>{message}</p>
      {retryable && (
        <button
          type="button"
          onClick={() => void onRetry()}
          style={{
            background: 'transparent',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 6,
            color: '#e2e8f0',
            padding: '4px 10px',
            cursor: 'pointer',
          }}
        >
          Retry
        </button>
      )}
    </div>
  )
}

function ReadyState({ data, degraded, onRefresh }: { data: WidgetPresentationData; degraded: boolean; onRefresh: () => void }) {
  const headline = extractHeadline(data)
  const dotHex = resolveColorTokenHex(headline.severity.displayColorToken)

  return (
    <div style={containerStyle} data-widget-state="ready">
      {degraded && (
        <p style={{ fontSize: 12, opacity: 0.6, margin: '0 0 8px 0' }} data-widget-degraded="true">
          Data may be incomplete.
        </p>
      )}
      <p style={{ fontSize: 13, opacity: 0.7, margin: '0 0 4px 0' }}>{headline.label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, margin: '0 0 8px 0', display: 'flex', alignItems: 'center' }}>
        <Dot hex={dotHex} />
        {headline.score}
      </p>

      {data.badges.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {data.badges.map((badge) => (
            <span
              key={badge.id}
              style={{
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                color: resolveColorTokenHex(badge.colorToken),
              }}
            >
              {badge.label}
            </span>
          ))}
        </div>
      )}

      {data.metrics.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          {data.metrics.map((metric) => (
            <div key={metric.metricId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '2px 0' }}>
              <span style={{ opacity: 0.7 }}>
                <Dot hex={resolveColorTokenHex(metric.colorToken)} />
                {metric.label}
              </span>
              <span>{metric.displayValue}</span>
            </div>
          ))}
        </div>
      )}

      {data.topRecommendations.length > 0 && (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {data.topRecommendations.map((rec) => (
            <li key={rec.recommendationId} style={{ fontSize: 12, marginBottom: 6 }}>
              <span style={{ fontWeight: 600 }}>
                <Dot hex={resolveColorTokenHex(rec.colorToken)} />
                {rec.title}
              </span>
              <p style={{ margin: '2px 0 0 14px', opacity: 0.7 }}>{rec.description}</p>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => void onRefresh()}
        style={{
          marginTop: 10,
          background: 'transparent',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 6,
          color: '#e2e8f0',
          padding: '4px 10px',
          cursor: 'pointer',
        }}
      >
        Refresh
      </button>
    </div>
  )
}

export function WidgetRenderBoundary({ result }: WidgetRenderBoundaryProps) {
  switch (result.renderState) {
    case 'loading':
      return <LoadingState />
    case 'disposed':
      return <DisposedState />
    case 'error':
      return (
        <ErrorLikeState
          headline="Something went wrong"
          message={result.error?.message ?? 'An unknown error occurred.'}
          retryable={result.error?.retryable ?? false}
          onRetry={result.refresh}
        />
      )
    case 'offline':
      return (
        <ErrorLikeState
          headline="Temporarily unavailable"
          message={result.error?.message ?? 'This widget is temporarily offline.'}
          retryable={true}
          onRetry={result.refresh}
        />
      )
    case 'rate_limited':
      return (
        <ErrorLikeState
          headline="Please wait"
          message={result.error?.message ?? 'Too many requests — try again shortly.'}
          retryable={true}
          onRetry={result.refresh}
        />
      )
    case 'ready':
      if (!result.data) return <LoadingState />
      return <ReadyState data={result.data} degraded={result.degraded} onRefresh={result.refresh} />
  }
}

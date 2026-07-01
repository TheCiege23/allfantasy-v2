'use client'

/**
 * Decision OS — Phase 7.8 React Adapter: composed convenience component.
 *
 * `useAllFantasyWidget` (data) + `WidgetRenderBoundary` (presentation),
 * composed. A host app that doesn't need direct access to lifecycle state
 * or the refresh engine can use this single component.
 */

import { useAllFantasyWidget } from './useAllFantasyWidget'
import { WidgetRenderBoundary } from './WidgetRenderBoundary'
import type { UseAllFantasyWidgetOptions } from './types'

export function AllFantasyWidget(options: UseAllFantasyWidgetOptions) {
  const result = useAllFantasyWidget(options)
  return <WidgetRenderBoundary result={result} />
}

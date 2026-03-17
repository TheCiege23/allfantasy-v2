'use client'

import { useEffect, useRef } from 'react'
import { trackLandingToolVisit } from '@/lib/landing-analytics'

/** Fires landing_tool_visit once on mount. Add to tool landing pages for conversion tracking. PROMPT 169. */
export function LandingToolVisitTracker({
  path,
  toolName,
}: {
  path: string
  toolName?: string
}) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    trackLandingToolVisit({ path, tool_name: toolName })
  }, [path, toolName])
  return null
}

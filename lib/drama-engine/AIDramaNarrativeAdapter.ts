/**
 * AIDramaNarrativeAdapter — optional AI-generated narrative summary for a drama event.
 * Can be extended to call OpenAI/DeepSeek for "Tell me the story" responses.
 */

import type { DramaEventView } from './DramaTimelineBuilder'

export interface DramaNarrativeResult {
  narrative: string
  source: 'template' | 'ai'
}

/**
 * Produce a short narrative for the drama event. Default: template-based; can be wired to AI later.
 */
export function buildDramaNarrative(event: DramaEventView): DramaNarrativeResult {
  const parts: string[] = []
  parts.push(event.headline)
  if (event.summary) parts.push(event.summary)
  if (event.relatedManagerIds.length > 0) {
    parts.push(`Involving: ${event.relatedManagerIds.slice(0, 4).join(', ')}.`)
  }
  parts.push(`Drama score: ${event.dramaScore.toFixed(0)}/100.`)
  return {
    narrative: parts.join(' '),
    source: 'template',
  }
}

/**
 * Phase 2B — IntentClassifier
 *
 * Deterministic keyword classifier over the latest user message (plus a short
 * tail of conversation history). Pure CPU, no AI calls, no I/O. Used by the
 * `ProviderSelector` to decide which context providers to load for a given
 * Chimmy turn.
 *
 * Design notes:
 *  - Classification is best-effort. A "general" intent is always a safe fallback.
 *  - Multi-match: we return the highest-scoring intent. Ties break in priority order.
 *  - Never throws; always returns a `ChimmyIntent`.
 */

export type ChimmyIntent =
  | "trade"
  | "waiver"
  | "dynasty"
  | "rankings"
  | "matchup"
  | "draft"
  | "start_sit"
  | "general"

export type IntentMatch = {
  intent: ChimmyIntent
  confidence: number
  matchedTerms: string[]
}

/**
 * Term lists are intentionally small + conservative. Add to them based on
 * observed misses rather than guessing.
 */
const INTENT_TERMS: Record<Exclude<ChimmyIntent, "general">, RegExp[]> = {
  start_sit: [
    /\bstart\b.*\bor\b.*\bsit\b/i,
    /\bsit\b.*\bor\b.*\bstart\b/i,
    /\bstart\/sit\b/i,
    /\bwho (?:should i|do i|to) start\b/i,
    /\blineup\b/i,
    /\bflex (?:decision|spot)\b/i,
  ],
  trade: [
    /\btrade\b/i,
    /\btrad(?:e|ing|ed|er)\b/i,
    /\bbuy[- ]?low\b/i,
    /\bsell[- ]?high\b/i,
    /\boffer\b/i,
    /\bcounter[- ]?offer\b/i,
    /\bswap\b/i,
  ],
  waiver: [
    /\bwaiver\b/i,
    /\bwaivers\b/i,
    /\bfaab\b/i,
    /\bfree[- ]?agent\b/i,
    /\bpickup\b/i,
    /\bstreamer\b/i,
    /\bdrop\b/i,
    /\badd\/drop\b/i,
  ],
  dynasty: [
    /\bdynasty\b/i,
    /\brebuild\b/i,
    /\bcontend(?:er|ing)?\b/i,
    /\bwindow\b/i,
    /\brookie pick\b/i,
    /\bfuture pick\b/i,
    /\b1st\s*round (?:rookie|pick)\b/i,
  ],
  rankings: [
    /\branking(?:s)?\b/i,
    /\btier(?:s|ed)?\b/i,
    /\bvaluation\b/i,
    /\bvalue (?:of|chart)\b/i,
    /\bktc\b/i,
    /\badp\b/i,
  ],
  matchup: [
    /\bmatchup\b/i,
    /\bopponent\b/i,
    /\bthis week\b/i,
    /\bprojection(?:s)?\b/i,
    /\bvs\.?\s+[A-Z]/,
    /\bplayoff (?:odds|seed)\b/i,
    /\bstandings\b/i,
  ],
  draft: [
    /\bdraft\b/i,
    /\bmock draft\b/i,
    /\brookie draft\b/i,
    /\bdraft strategy\b/i,
    /\bpick (?:\d|number)\b/i,
    /\b\d+\.\d+\b/, // round.pick notation like "2.05"
  ],
}

/** Order matters for tie-breaks. More specific intents win. */
const PRIORITY: ChimmyIntent[] = [
  "start_sit",
  "trade",
  "waiver",
  "dynasty",
  "rankings",
  "matchup",
  "draft",
  "general",
]

export type ClassifyInput = {
  message: string
  history?: Array<{ role: "user" | "assistant"; content: string }>
}

/**
 * Classify a Chimmy turn. Examines the latest message + up to the last 2
 * messages of history. Returns the top intent and its matched terms.
 */
export function classifyChimmyIntent(input: ClassifyInput): IntentMatch {
  const tail = (input.history ?? []).slice(-2).map((h) => h.content).join(" ")
  const haystack = `${input.message ?? ""} ${tail}`.trim()
  if (!haystack) {
    return { intent: "general", confidence: 0, matchedTerms: [] }
  }

  const scores = new Map<ChimmyIntent, { score: number; matched: string[] }>()
  for (const [intent, patterns] of Object.entries(INTENT_TERMS) as Array<
    [Exclude<ChimmyIntent, "general">, RegExp[]]
  >) {
    let score = 0
    const matched: string[] = []
    for (const re of patterns) {
      const m = haystack.match(re)
      if (m) {
        score += 1
        matched.push(m[0])
      }
    }
    if (score > 0) scores.set(intent, { score, matched })
  }

  if (scores.size === 0) {
    return { intent: "general", confidence: 0, matchedTerms: [] }
  }

  // Tie-break by PRIORITY order.
  let best: { intent: ChimmyIntent; score: number; matched: string[] } | null = null
  for (const candidate of PRIORITY) {
    const entry = scores.get(candidate)
    if (!entry) continue
    if (!best || entry.score > best.score) {
      best = { intent: candidate, score: entry.score, matched: entry.matched }
    }
  }
  if (!best) return { intent: "general", confidence: 0, matchedTerms: [] }

  // Confidence: normalized to [0, 1] using a soft saturating curve.
  const confidence = Math.min(1, best.score / 3)
  return { intent: best.intent, confidence, matchedTerms: best.matched }
}

/**
 * Phase 2B — TokenBudget
 *
 * Char-budget allocator for prompt sections. We approximate tokens as
 * `chars / 4` (a safe overestimate for English). Each section has:
 *   - priority: 'required' (kept at min length even if total overflows)
 *                'preferred' (truncated tail-first)
 *                'optional'  (dropped entirely if needed)
 *   - maxChars: hard cap per section
 *   - minChars: floor for required sections (defaults to 0)
 *
 * Algorithm:
 *  1. Cap each section at its `maxChars`.
 *  2. If total <= budget → return as-is.
 *  3. Else drop `optional` sections from the tail until under budget.
 *  4. Else truncate `preferred` sections from longest first.
 *  5. Else truncate `required` sections down to their `minChars` floor.
 */

export type SectionPriority = "required" | "preferred" | "optional"

export type PromptSection = {
  /** Stable id used for debug + dedupe. */
  id: string
  /** Markdown-ready text. May be empty (treated as drop). */
  content: string
  priority: SectionPriority
  maxChars: number
  minChars?: number
}

export type BudgetResult = {
  sections: Array<{ id: string; content: string; dropped: boolean; truncated: boolean }>
  totalChars: number
  approxTokens: number
  withinBudget: boolean
  budgetChars: number
}

const TRUNCATION_MARKER = "\n…(truncated)"

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const room = Math.max(0, max - TRUNCATION_MARKER.length)
  return text.slice(0, room) + TRUNCATION_MARKER
}

export function applyTokenBudget(
  sections: PromptSection[],
  options: { budgetChars: number }
): BudgetResult {
  const budget = Math.max(0, options.budgetChars)

  // Step 1: per-section cap.
  const capped = sections.map((s) => ({
    id: s.id,
    priority: s.priority,
    minChars: s.minChars ?? 0,
    content: s.content.length === 0 ? "" : truncate(s.content, s.maxChars),
    truncated: s.content.length > s.maxChars,
    dropped: s.content.length === 0,
  }))

  const total = () =>
    capped.reduce((sum, s) => sum + (s.dropped ? 0 : s.content.length), 0)

  // Step 2: under budget? done.
  if (total() <= budget) {
    return finalize(capped, budget)
  }

  // Step 3: drop optional sections from end → start.
  for (let i = capped.length - 1; i >= 0; i--) {
    if (total() <= budget) break
    const s = capped[i]
    if (s.priority === "optional" && !s.dropped) {
      s.dropped = true
      s.content = ""
    }
  }
  if (total() <= budget) return finalize(capped, budget)

  // Step 4: truncate `preferred` sections, longest first.
  const preferred = capped
    .filter((s) => s.priority === "preferred" && !s.dropped)
    .sort((a, b) => b.content.length - a.content.length)
  for (const s of preferred) {
    if (total() <= budget) break
    const overshoot = total() - budget
    const shrinkTo = Math.max(0, s.content.length - overshoot)
    s.content = truncate(s.content, Math.max(shrinkTo, 0))
    s.truncated = true
    if (s.content.length === 0) s.dropped = true
  }
  if (total() <= budget) return finalize(capped, budget)

  // Step 5: shrink required sections down to their floor.
  const required = capped
    .filter((s) => s.priority === "required" && !s.dropped)
    .sort((a, b) => b.content.length - a.content.length)
  for (const s of required) {
    if (total() <= budget) break
    const overshoot = total() - budget
    const shrinkTo = Math.max(s.minChars, s.content.length - overshoot)
    s.content = truncate(s.content, shrinkTo)
    s.truncated = true
  }

  return finalize(capped, budget)
}

function finalize(
  capped: Array<{
    id: string
    content: string
    dropped: boolean
    truncated: boolean
  }>,
  budget: number
): BudgetResult {
  const sections = capped.map((s) => ({
    id: s.id,
    content: s.dropped ? "" : s.content,
    dropped: s.dropped,
    truncated: s.truncated,
  }))
  const totalChars = sections.reduce((sum, s) => sum + s.content.length, 0)
  return {
    sections,
    totalChars,
    approxTokens: Math.ceil(totalChars / 4),
    withinBudget: totalChars <= budget,
    budgetChars: budget,
  }
}

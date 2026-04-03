/** Extract JSON object/array from Claude output (raw or fenced). */
export function parseJsonFromClaudeText(text: string): unknown {
  const trimmed = text.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed)
  const raw = fence ? fence[1].trim() : trimmed
  try {
    return JSON.parse(raw)
  } catch {
    const start = raw.indexOf('{')
    const end = raw.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(raw.slice(start, end + 1))
    }
    throw new Error('Model did not return valid JSON')
  }
}

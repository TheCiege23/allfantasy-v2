/**
 * Read a fetch Response body once as JSON and surface API error text when !ok.
 * Avoids losing the real message when the server returns HTML or non-JSON errors.
 */
export async function readFetchJson<T = unknown>(
  res: Response
): Promise<{ ok: boolean; status: number; data: T | null; errorMessage: string | null }> {
  const text = await res.text()
  let parsed: unknown = null
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = null
    }
  }

  if (res.ok) {
    return { ok: true, status: res.status, data: parsed as T, errorMessage: null }
  }

  const obj = parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
  const issues = obj && Array.isArray((obj as { issues?: unknown }).issues)
    ? (obj as { issues: { message?: string }[] }).issues
    : null
  const issueMsg =
    issues && typeof issues[0]?.message === 'string' && issues[0].message.trim()
      ? issues[0].message.trim()
      : null

  const fromJson =
    (typeof obj?.error === 'string' && obj.error.trim()) ||
    (typeof obj?.message === 'string' && obj.message.trim()) ||
    issueMsg

  if (fromJson) {
    return { ok: false, status: res.status, data: parsed as T, errorMessage: fromJson }
  }

  const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 280)
  return {
    ok: false,
    status: res.status,
    data: parsed as T,
    errorMessage: snippet || `Request failed (${res.status})`,
  }
}

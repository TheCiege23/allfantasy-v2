/**
 * Input validation helpers for API routes: body size limits, safe parsing.
 */

const DEFAULT_MAX_JSON_BYTES = 1024 * 1024 // 1MB

/**
 * Parse JSON body with optional size limit. Rejects when Content-Length exceeds maxBytes.
 * Use before processing sensitive or heavy payloads.
 */
export async function parseJsonBodySafe<T = unknown>(
  request: Request,
  options?: { maxBytes?: number }
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_JSON_BYTES
  const contentLength = request.headers.get("content-length")
  if (contentLength) {
    const len = parseInt(contentLength, 10)
    if (!Number.isNaN(len) && len > maxBytes) {
      return {
        ok: false,
        status: 413,
        error: "Request body too large",
      }
    }
  }

  try {
    const data = (await request.json()) as T
    return { ok: true, data }
  } catch (e) {
    return {
      ok: false,
      status: 400,
      error: "Invalid JSON body",
    }
  }
}

export const MAX_JSON_BODY_BYTES = DEFAULT_MAX_JSON_BYTES

import "server-only"

const REQUEST_BATCH_SIZE = 40
const REQUEST_TIMEOUT_MS = 12000
const GOOGLE_TRANSLATE_ENDPOINT = "https://translation.googleapis.com/language/translate/v2"

function isTemplateHeavy(value: string): boolean {
  return value.includes("{{") || value.includes("}}")
}

async function translateBatch(texts: string[], targetLang: string): Promise<string[] | null> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY?.trim()
  if (!apiKey || texts.length === 0) return null

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${GOOGLE_TRANSLATE_ENDPOINT}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: texts,
        source: "en",
        target: targetLang,
        format: "text",
      }),
      signal: controller.signal,
    })

    if (!response.ok) return null

    const payload = (await response.json()) as {
      data?: { translations?: Array<{ translatedText?: string }> }
    }
    const translated = payload.data?.translations
    if (!Array.isArray(translated)) return null
    return translated.map((entry) => String(entry?.translatedText ?? ""))
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

export async function translateMissingEnglishKeysWithGoogle(entries: Record<string, string>, targetLang = 'es'): Promise<Record<string, string>> {
  const filtered = Object.entries(entries).filter(
    ([, value]) =>
      typeof value === "string" &&
      value.trim().length > 0 &&
      !isTemplateHeavy(value)
  ) as Array<[string, string]>

  if (filtered.length === 0) return {}

  const result: Record<string, string> = {}
  const keys = filtered.map(([key]) => key)
  const values = filtered.map(([, value]) => value)

  const chunks: string[][] = []
  for (let i = 0; i < values.length; i += REQUEST_BATCH_SIZE) {
    chunks.push(values.slice(i, i + REQUEST_BATCH_SIZE))
  }

  const batchResults = await Promise.all(
    chunks.map((batch) => translateBatch(batch, targetLang)),
  )

  let offset = 0
  for (let c = 0; c < chunks.length; c++) {
    const batch = chunks[c]!
    const translated = batchResults[c]
    if (!translated) {
      for (let j = 0; j < batch.length; j++) {
        result[keys[offset + j]!] = batch[j]!
      }
    } else {
      for (let j = 0; j < batch.length; j++) {
        const translatedText = translated[j]
        result[keys[offset + j]!] =
          translatedText && translatedText.trim() ? translatedText : batch[j]!
      }
    }
    offset += batch.length
  }

  return result
}

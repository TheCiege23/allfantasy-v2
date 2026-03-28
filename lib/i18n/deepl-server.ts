import "server-only"

const DEFAULT_DEEPL_BASE_URL = "https://api-free.deepl.com"
const REQUEST_BATCH_SIZE = 40
const REQUEST_TIMEOUT_MS = 12_000

type TextEntry = [key: string, value: string]

const deeplGlobal = globalThis as typeof globalThis & {
  __afDeeplEsCache?: Map<string, string>
}
const deeplEsCache = deeplGlobal.__afDeeplEsCache ?? new Map<string, string>()
deeplGlobal.__afDeeplEsCache = deeplEsCache

function isTemplateHeavy(value: string): boolean {
  return value.includes("{{") || value.includes("}}")
}

async function translateBatch(texts: string[]): Promise<string[] | null> {
  const apiKey = process.env.DEEPL_API_KEY?.trim()
  if (!apiKey) return null

  const baseUrl = (process.env.DEEPL_API_BASE_URL || DEFAULT_DEEPL_BASE_URL).replace(/\/+$/, "")
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${baseUrl}/v2/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: texts,
        source_lang: "EN",
        target_lang: "ES",
        preserve_formatting: true,
      }),
      signal: controller.signal,
    })

    if (!response.ok) return null
    const payload = (await response.json()) as { translations?: Array<{ text?: string }> }
    if (!Array.isArray(payload.translations)) return null
    return payload.translations.map((entry) => String(entry?.text ?? ""))
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * DeepL fallback for untranslated keys.
 * Translates only missing ES keys using EN source strings.
 */
export async function translateMissingEnglishKeysWithDeepL(
  englishEntries: Record<string, string>
): Promise<Record<string, string>> {
  const missing = Object.entries(englishEntries).filter(
    ([, value]) =>
      typeof value === "string" &&
      value.trim().length > 0 &&
      !isTemplateHeavy(value)
  ) as TextEntry[]

  if (missing.length === 0) return {}
  if (!process.env.DEEPL_API_KEY) return {}

  const result: Record<string, string> = {}
  const toTranslate: TextEntry[] = []

  for (const [key, value] of missing) {
    const cached = deeplEsCache.get(value)
    if (cached) {
      result[key] = cached
      continue
    }
    toTranslate.push([key, value])
  }

  for (let i = 0; i < toTranslate.length; i += REQUEST_BATCH_SIZE) {
    const batch = toTranslate.slice(i, i + REQUEST_BATCH_SIZE)
    const translated = await translateBatch(batch.map(([, text]) => text))
    if (!translated) continue

    for (let index = 0; index < batch.length; index += 1) {
      const [key, sourceText] = batch[index]!
      const translatedText = translated[index]
      if (!translatedText || !translatedText.trim()) continue
      deeplEsCache.set(sourceText, translatedText)
      result[key] = translatedText
    }
  }

  return result
}


/**
 * Generates lib/i18n/translations-es-parity.ts with keys present in en but missing from es.
 * Uses GOOGLE_TRANSLATE_API_KEY when set (same pipeline as /api/i18n/translations).
 * Run: npx tsx scripts/generate-es-parity.ts
 * Optional: load .env for API key (Next.js-style file at repo root).
 */
import { readFileSync, writeFileSync } from "fs"
import { join } from "path"

try {
  const envPath = join(process.cwd(), ".env")
  const raw = readFileSync(envPath, "utf8")
  for (const line of raw.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq <= 0) continue
    const k = trimmed.slice(0, eq).trim()
    let v = trimmed.slice(eq + 1).trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    if (k === "GOOGLE_TRANSLATE_API_KEY" && !process.env.GOOGLE_TRANSLATE_API_KEY) {
      process.env.GOOGLE_TRANSLATE_API_KEY = v
    }
  }
} catch {
  // no .env
}
import { translations } from "../lib/i18n/translations"

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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q: texts, source: "en", target: targetLang, format: "text" }),
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

async function translateMissingEnglishKeysWithGoogle(
  entries: Record<string, string>,
  targetLang = "es",
): Promise<Record<string, string>> {
  const filtered = Object.entries(entries).filter(
    ([, value]) => typeof value === "string" && value.trim().length > 0 && !isTemplateHeavy(value),
  ) as Array<[string, string]>

  if (filtered.length === 0) return {}

  const result: Record<string, string> = {}
  const keys = filtered.map(([key]) => key)
  const values = filtered.map(([, value]) => value)

  const chunks: string[][] = []
  for (let i = 0; i < values.length; i += REQUEST_BATCH_SIZE) {
    chunks.push(values.slice(i, i + REQUEST_BATCH_SIZE))
  }

  const batchResults = await Promise.all(chunks.map((batch) => translateBatch(batch, targetLang)))

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

function escapeTsStringLiteral(s: string): string {
  return JSON.stringify(s)
}

async function main() {
  const en = translations.en
  const esExisting = translations.es
  const missing: Record<string, string> = {}
  for (const key of Object.keys(en)) {
    if (esExisting[key] === undefined) {
      missing[key] = en[key]!
    }
  }
  const keys = Object.keys(missing)
  console.error(`Missing keys to fill: ${keys.length}`)

  const translated = await translateMissingEnglishKeysWithGoogle(missing, "es")
  const merged: Record<string, string> = { ...missing }
  for (const [k, v] of Object.entries(translated)) {
    merged[k] = v
  }
  for (const k of keys) {
    if (!merged[k]?.trim()) merged[k] = missing[k]!
  }

  const sortedKeys = Object.keys(merged).sort()
  const lines = [
    `/** Auto-generated: Spanish parity for keys that existed only in en. Regenerate: npx tsx scripts/generate-es-parity.ts */`,
    `export const translationsEsParity: Record<string, string> = {`,
  ]
  for (const k of sortedKeys) {
    const v = merged[k]!
    lines.push(`  ${JSON.stringify(k)}: ${escapeTsStringLiteral(v)},`)
  }
  lines.push(`}`)
  lines.push(``)

  const outPath = join(process.cwd(), "lib/i18n/translations-es-parity.ts")
  writeFileSync(outPath, lines.join("\n"), "utf8")
  console.error(`Wrote ${outPath}`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})

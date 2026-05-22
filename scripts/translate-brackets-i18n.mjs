#!/usr/bin/env node
/**
 * translate-brackets-i18n.mjs
 *
 * DEV-ONLY helper to fill missing translations in the brackets / world
 * cup i18n dictionaries using Google Cloud Translation v2.
 *
 *   USAGE
 *     node scripts/translate-brackets-i18n.mjs              # default: dry-run review
 *     node scripts/translate-brackets-i18n.mjs --write      # opt-in write-back (NOT implemented yet)
 *     node scripts/translate-brackets-i18n.mjs --locale es  # only this locale
 *     node scripts/translate-brackets-i18n.mjs --module brackets   # only bracketsI18n
 *     node scripts/translate-brackets-i18n.mjs --module world-cup  # only worldCupI18n
 *
 *   ENVIRONMENT
 *     GOOGLE_TRANSLATE_API_KEY    Required. Google Cloud Translation v2
 *                                 API key with the Cloud Translation API
 *                                 enabled. The script exits cleanly with
 *                                 a clear error if this env var is missing.
 *
 *   SAFETY GUARANTEES (verified by tests + grep audit)
 *     - This file is NEVER imported by app runtime code. It is invoked
 *       manually by humans during translation maintenance.
 *     - The API key is read ONLY from process.env, never bundled into
 *       client/server output. It does not appear in any tsx/ts module.
 *     - Default behavior is dry-run: writes a review JSON to
 *         tmp/brackets-i18n-translations.review.json
 *       so the team can review machine output before editing the
 *       hand-translated dictionaries. `--write` is intentionally NOT
 *       implemented in this revision — Google output still needs human
 *       review before landing in product copy.
 *     - The script does NOT mutate any source file by default.
 *     - The script does NOT trigger any framework build or server route.
 *
 *   PIPELINE
 *     1. Read lib/world-cup/worldCupI18n.ts and lib/brackets/bracketsI18n.ts
 *        as plain text.
 *     2. Extract the EN object literal of each module.
 *     3. For every other locale block in the same file, list keys present
 *        in EN but missing OR equal to the EN value (the latter usually
 *        means "not yet translated").
 *     4. Batch the candidate strings into Google Translate v2 q[] calls
 *        in chunks of up to 100 strings per request, one request per
 *        target locale.
 *     5. Write the proposed translations to
 *          tmp/brackets-i18n-translations.review.json
 *     6. Print a summary to stderr.
 *
 *   NOT IN SCOPE
 *     - Updating the source dictionaries directly. Translations are
 *       review-only here; an engineer paste-edits them after review.
 *     - Detecting tone / brand alignment. The reviewer is the gate.
 *     - Pluralization heuristics. The dictionary uses explicit
 *       `*.poolsCountOne` / `*.poolsCountOther` pairs already.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import process from "node:process"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const REPO_ROOT = resolve(__dirname, "..")

// ── CLI flags ────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const isWrite = args.includes("--write")
const localeFlagIdx = args.indexOf("--locale")
const onlyLocale = localeFlagIdx >= 0 ? args[localeFlagIdx + 1] : null
const moduleFlagIdx = args.indexOf("--module")
const onlyModule = moduleFlagIdx >= 0 ? args[moduleFlagIdx + 1] : null
const isHelp = args.includes("--help") || args.includes("-h")

if (isHelp) {
  printUsage()
  process.exit(0)
}

if (isWrite) {
  console.error(
    "[translate-brackets-i18n] --write is not implemented in this revision."
  )
  console.error(
    "[translate-brackets-i18n] Translations land in a review JSON; a human edits the dictionary."
  )
  process.exit(2)
}

// ── ENV check ───────────────────────────────────────────────────────────
const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY
if (!API_KEY) {
  console.error(
    "[translate-brackets-i18n] Missing GOOGLE_TRANSLATE_API_KEY env var."
  )
  console.error("")
  console.error("  Set it for this shell session only — do NOT commit it.")
  console.error("")
  console.error("  PowerShell:")
  console.error('    $env:GOOGLE_TRANSLATE_API_KEY = "your-api-key"')
  console.error("    node scripts/translate-brackets-i18n.mjs")
  console.error("")
  console.error("  bash / zsh:")
  console.error('    export GOOGLE_TRANSLATE_API_KEY="your-api-key"')
  console.error("    node scripts/translate-brackets-i18n.mjs")
  console.error("")
  console.error(
    "  Generate a key in Google Cloud Console → APIs & Services → Credentials."
  )
  console.error("  The Cloud Translation API must be enabled for the project.")
  process.exit(1)
}

// ── Module definitions ───────────────────────────────────────────────────
const MODULES = [
  {
    id: "world-cup",
    file: "lib/world-cup/worldCupI18n.ts",
    locales: ["es", "zh", "fil", "vi"],
    // Locales in this file are TS const blocks named EN / ES / ZH / FIL /
    // VI. Treat each as a record we can diff.
    blocks: { en: "EN", es: "ES", zh: "ZH", fil: "FIL", vi: "VI" },
  },
  {
    id: "brackets",
    file: "lib/brackets/bracketsI18n.ts",
    locales: ["es", "zh", "fil", "vi"],
    blocks: { en: "EN", es: "ES", zh: "ZH", fil: "FIL", vi: "VI" },
  },
]

// Google Translate v2 expects ISO 639-1 codes. Map our app codes:
const GOOGLE_LOCALE_CODE = {
  en: "en",
  es: "es",
  // Traditional Chinese. v2 accepts "zh-TW".
  zh: "zh-TW",
  // Filipino. v2 accepts "fil" or "tl".
  fil: "fil",
  vi: "vi",
}

const REVIEW_OUT = resolve(REPO_ROOT, "tmp", "brackets-i18n-translations.review.json")

// ── Parser ───────────────────────────────────────────────────────────────
/**
 * Extracts the contents of a `const NAME: Type = { ... }` object literal
 * from a TypeScript source string. Returns null if the block isn't found.
 * Very narrow parser tuned to the shape of our i18n files; not a general
 * TS parser. Works because the i18n dictionaries are flat
 * `"key": "value"` records with no nested objects, no spread, and no
 * computed property names.
 */
function extractDictBlock(source, constName) {
  const re = new RegExp(
    `const\\s+${constName}\\s*:\\s*[A-Za-z]+Dictionary\\s*=\\s*\\{([\\s\\S]*?)\\n\\}`,
    "m"
  )
  const m = source.match(re)
  if (!m) return null
  return m[1]
}

/**
 * Parses a flat record body into { key: value } entries. Handles single
 * and multi-line string values via JSON.parse on the quoted segment.
 * Lines starting with `//` are skipped. Trailing commas allowed.
 */
function parseDictEntries(body) {
  const out = {}
  // Match: optional whitespace, "key": "value" (single line or with
  // continuation), trailing comma, possible inline comment. We use a
  // greedy non-eol match for the key, then a JSON.parse-able string for
  // the value. Multi-line string values (concatenated with +) aren't used
  // in our dictionaries, but we tolerate string-spanning forms by
  // joining adjacent string literals.
  const entryRe =
    /"((?:[^"\\]|\\.)+)"\s*:\s*((?:"(?:[^"\\]|\\.)*"\s*(?:\+\s*)?)+)\s*,/g
  let match
  while ((match = entryRe.exec(body)) !== null) {
    const key = JSON.parse(`"${match[1]}"`)
    // Strip the `+` joiners and concat the string segments.
    const valueSrc = match[2]
      .split(/\s*\+\s*/)
      .map((piece) => JSON.parse(piece.trim()))
      .join("")
    out[key] = valueSrc
  }
  return out
}

// ── Diff: find missing or untranslated keys ─────────────────────────────
function findMissingTranslations(enDict, localeDict) {
  const missing = []
  for (const [key, enValue] of Object.entries(enDict)) {
    const localeValue = localeDict[key]
    if (localeValue === undefined) {
      missing.push({ key, en: enValue, reason: "missing" })
      continue
    }
    if (localeValue === enValue) {
      missing.push({ key, en: enValue, reason: "untranslated_equal_to_en" })
    }
  }
  return missing
}

// ── Google Translate v2 batch call ──────────────────────────────────────
async function googleTranslateBatch(qs, target) {
  if (qs.length === 0) return []
  const url = new URL("https://translation.googleapis.com/language/translate/v2")
  url.searchParams.set("key", API_KEY)
  url.searchParams.set("target", target)
  url.searchParams.set("source", "en")
  url.searchParams.set("format", "text")

  const body = new URLSearchParams()
  for (const q of qs) body.append("q", q)

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(
      `Google Translate v2 returned HTTP ${res.status} ${res.statusText} for target=${target}. ${text}`
    )
  }
  const json = await res.json()
  const translations = json?.data?.translations
  if (!Array.isArray(translations) || translations.length !== qs.length) {
    throw new Error(
      `Google Translate v2 returned ${translations?.length ?? 0} results for ${qs.length} inputs.`
    )
  }
  return translations.map((t) => t.translatedText)
}

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

// ── Main ────────────────────────────────────────────────────────────────
async function main() {
  const review = {
    generatedAt: new Date().toISOString(),
    note:
      "Machine output from Google Cloud Translation v2. Human review required before editing the source dictionaries. Brand terms (AF Pro, AllFantasy, FIFA), short labels, and any UI tone-sensitive copy should be hand-edited.",
    modules: [],
  }

  for (const mod of MODULES) {
    if (onlyModule && onlyModule !== mod.id) continue

    const filePath = resolve(REPO_ROOT, mod.file)
    const source = readFileSync(filePath, "utf8")
    const enBody = extractDictBlock(source, mod.blocks.en)
    if (!enBody) {
      console.error(
        `[translate-brackets-i18n] Could not find EN block in ${mod.file}.`
      )
      process.exit(3)
    }
    const enDict = parseDictEntries(enBody)
    const enKeys = Object.keys(enDict).length

    const modOut = { module: mod.id, file: mod.file, enKeys, locales: [] }

    for (const locale of mod.locales) {
      if (onlyLocale && onlyLocale !== locale) continue
      const blockName = mod.blocks[locale]
      const body = extractDictBlock(source, blockName)
      const localeDict = body ? parseDictEntries(body) : {}
      const missing = findMissingTranslations(enDict, localeDict)
      console.error(
        `[translate-brackets-i18n] ${mod.id} ${locale}: ${missing.length} candidate(s) of ${enKeys} keys`
      )
      if (missing.length === 0) {
        modOut.locales.push({ locale, count: 0, items: [] })
        continue
      }
      const target = GOOGLE_LOCALE_CODE[locale]
      const batches = chunk(missing.map((m) => m.en), 100)
      const translated = []
      let batchIndex = 0
      for (const batch of batches) {
        batchIndex += 1
        console.error(
          `[translate-brackets-i18n]   batch ${batchIndex}/${batches.length} → ${target} (${batch.length} strings)`
        )
        // eslint-disable-next-line no-await-in-loop
        const out = await googleTranslateBatch(batch, target)
        translated.push(...out)
      }
      modOut.locales.push({
        locale,
        count: missing.length,
        items: missing.map((m, i) => ({
          key: m.key,
          reason: m.reason,
          en: m.en,
          proposed: translated[i],
        })),
      })
    }
    review.modules.push(modOut)
  }

  const outDir = dirname(REVIEW_OUT)
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  writeFileSync(REVIEW_OUT, JSON.stringify(review, null, 2), "utf8")
  console.error("")
  console.error(`[translate-brackets-i18n] Wrote review file:`)
  console.error(`  ${REVIEW_OUT}`)
  console.error("")
  console.error(
    "Next steps: open the JSON, copy the `proposed` values into the source dictionaries after human review, and re-run `npx vitest run __tests__/world-cup-i18n.test.ts __tests__/brackets-i18n.test.ts`."
  )
}

function printUsage() {
  console.error(`Usage:
  node scripts/translate-brackets-i18n.mjs [options]

Options:
  --locale <code>    Only fill this locale. One of: es | zh | fil | vi
  --module <id>      Only this module. One of: brackets | world-cup
  --write            Reserved. Not implemented; this script is dry-run.
  -h, --help         Print this message.

Required env:
  GOOGLE_TRANSLATE_API_KEY    Google Cloud Translation v2 key.

Output:
  tmp/brackets-i18n-translations.review.json
`)
}

main().catch((err) => {
  console.error("[translate-brackets-i18n] Failed:", err.message)
  process.exit(10)
})

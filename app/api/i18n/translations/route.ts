import { NextResponse } from "next/server"
import { DEFAULT_LANG, resolveLanguage } from "@/lib/i18n/constants"
import { translations } from "@/lib/i18n/translations"
import { translateMissingEnglishKeysWithDeepL } from "@/lib/i18n/deepl-server"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lang = resolveLanguage(searchParams.get("lang") ?? DEFAULT_LANG)

  const fallback = translations.en || {}
  const selected = translations[lang] || fallback
  const merged = {
    ...fallback,
    ...selected,
  }

  let deeplMessages: Record<string, string> = {}
  if (lang === "es") {
    const missingEsEntries: Record<string, string> = {}
    for (const [key, value] of Object.entries(fallback)) {
      if (selected[key] !== undefined) continue
      missingEsEntries[key] = value
    }
    deeplMessages = await translateMissingEnglishKeysWithDeepL(missingEsEntries)
  }

  return NextResponse.json({
    ok: true,
    language: lang,
    messages: {
      ...merged,
      ...deeplMessages,
    },
  })
}

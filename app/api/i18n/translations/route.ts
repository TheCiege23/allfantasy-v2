import { NextResponse } from "next/server"
import { DEFAULT_LANG, resolveLanguage } from "@/lib/i18n/constants"
import { translations } from "@/lib/i18n/translations"
import { translateMissingEnglishKeysWithGoogle } from "@/lib/i18n/google-translate-server"

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


  let googleMessages: Record<string, string> = {}
  if (lang === "es") {
    const missingEsEntries: Record<string, string> = {}
    for (const [key, value] of Object.entries(fallback)) {
      if (selected[key] !== undefined) continue
      missingEsEntries[key] = value
    }
    googleMessages = await translateMissingEnglishKeysWithGoogle(missingEsEntries, lang)
  }

  return NextResponse.json({
    ok: true,
    language: lang,
    messages: {
      ...merged,
      ...googleMessages,
    },
  })
}

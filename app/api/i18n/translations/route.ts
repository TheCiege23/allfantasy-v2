import { NextResponse } from "next/server"
import { DEFAULT_LANG, resolveLanguage } from "@/lib/i18n/constants"
import { translations } from "@/lib/i18n/translations"

export const runtime = "nodejs"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lang = resolveLanguage(searchParams.get("lang") ?? DEFAULT_LANG)

  const fallback = translations.en || {}
  const selected = translations[lang] || fallback

  return NextResponse.json({
    ok: true,
    language: lang,
    messages: {
      ...fallback,
      ...selected,
    },
  })
}

import { NextResponse } from "next/server"
import { DEFAULT_LANG, resolveLanguage } from "@/lib/i18n/constants"

export const runtime = "nodejs"

const COOKIE_NAME = "af_lang"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const nextLanguage = resolveLanguage(String((body as { language?: string })?.language ?? DEFAULT_LANG))

    const response = NextResponse.json({ ok: true, language: nextLanguage })
    response.cookies.set({
      name: COOKIE_NAME,
      value: nextLanguage,
      path: "/",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      secure: process.env.NODE_ENV === "production",
    })

    return response
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to save language preference." }, { status: 500 })
  }
}

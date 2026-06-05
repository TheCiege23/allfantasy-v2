"use client"

import { useEffect, useMemo } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { ensureMetaPixel, trackMetaEventAndMirror } from "@/lib/meta-client"

function resolveAiChimmyContent(pathname: string): { name: string; category: string } | null {
  if (pathname === "/ai-chat" || pathname.startsWith("/ai-chat/")) {
    return { name: "AI Chimmy Chat", category: "AI Chimmy" }
  }
  if (pathname === "/ai" || pathname.startsWith("/ai/")) {
    return { name: "AI Chimmy", category: "AI Chimmy" }
  }
  if (pathname.toLowerCase().includes("/chimmy")) {
    return { name: "AI Chimmy", category: "AI Chimmy" }
  }
  return null
}

export function MetaPixelPageViewTracker({ pixelId }: { pixelId: string }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const routeKey = useMemo(() => {
    if (!pathname) return ""
    const qs = searchParams?.toString()
    return qs ? `${pathname}?${qs}` : pathname
  }, [pathname, searchParams])

  useEffect(() => {
    ensureMetaPixel(pixelId)
  }, [pixelId])

  useEffect(() => {
    if (!pathname || typeof window === "undefined") return
    const sourceUrl = window.location.href
    const title = document.title || pathname

    trackMetaEventAndMirror(
      "PageView",
      {
        content_name: title,
        content_category: "Page",
        page_path: pathname,
      },
      { sourceId: routeKey, sourceUrl }
    )

    const chimmy = resolveAiChimmyContent(pathname)
    if (chimmy) {
      trackMetaEventAndMirror(
        "ViewContent",
        {
          content_name: chimmy.name,
          content_category: chimmy.category,
          page_path: pathname,
        },
        { sourceId: `chimmy:${routeKey}`, sourceUrl }
      )
    }
  }, [pathname, routeKey])

  return null
}

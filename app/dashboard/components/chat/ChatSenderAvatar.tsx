"use client"

import { useState } from "react"

function resolveSleeperAvatarUrl(value: string | null): string | null {
  if (!value) return null
  const v = value.trim()
  if (!v) return null
  if (v.startsWith("http://") || v.startsWith("https://") || v.startsWith("/")) {
    return v
  }
  return `https://sleepercdn.com/avatars/${v}`
}

/** First two letters for initials circle (spec: first 2 letters of display name). */
export function chatSenderInitials(displayName: string): string {
  const n = displayName.trim()
  if (!n) return "?"
  if (n.length >= 2) return n.slice(0, 2).toUpperCase()
  return (n[0]! + n[0]!).toUpperCase()
}

function fallbackBgClass(name: string): string {
  let h = 0
  const p = name.trim()
  for (let i = 0; i < p.length; i++) h = (h + p.charCodeAt(i) * (i + 1)) % 7
  const classes = [
    "bg-red-500/80",
    "bg-green-500/80",
    "bg-blue-500/80",
    "bg-orange-500/80",
    "bg-purple-500/80",
    "bg-indigo-500/80",
    "bg-slate-500/80",
  ]
  return classes[h] ?? "bg-slate-500/80"
}

const SIZE_PX = 32

type ChatSenderAvatarProps = {
  authorAvatar: string | null
  authorDisplayName: string
  className?: string
}

/**
 * 32px avatar: Sleeper CDN when `author_avatar` is set; initials circle on missing/broken image.
 * Uses `onError` increment pattern like `PlayerImage` (single URL → fallback UI).
 */
export function ChatSenderAvatar({ authorAvatar, authorDisplayName, className = "" }: ChatSenderAvatarProps) {
  const [broken, setBroken] = useState(false)
  const resolved = resolveSleeperAvatarUrl(authorAvatar)

  if (resolved && !broken) {
    return (
      <div
        className={`relative h-8 w-8 shrink-0 overflow-hidden rounded-full border border-white/[0.12] ${className}`}
        style={{ width: SIZE_PX, height: SIZE_PX }}
      >
        <img
          src={resolved}
          alt=""
          className="h-full w-full object-cover"
          style={{ boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)" }}
          onError={() => setBroken(true)}
        />
      </div>
    )
  }

  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.12] text-[10px] font-bold uppercase text-white ${fallbackBgClass(authorDisplayName)} ${className}`}
      style={{ width: SIZE_PX, height: SIZE_PX }}
      aria-hidden
    >
      {chatSenderInitials(authorDisplayName)}
    </div>
  )
}

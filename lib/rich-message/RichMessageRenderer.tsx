"use client"

import React from "react"
import type { PlatformChatMessage } from "@/types/platform-shared"
import { getSafeMessageMediaUrl } from "./safeMedia"

export type RichMessageRendererProps = {
  message: PlatformChatMessage
  onImageClick?: (url: string) => void
  className?: string
  style?: React.CSSProperties
}

/**
 * Renders a single chat message with support for text, image, gif, and file.
 * Safe rendering: only allow https or relative URLs for media.
 */
export function RichMessageRenderer({ message, onImageClick, className, style }: RichMessageRendererProps) {
  const type = message.messageType || "text"
  const body = message.body || ""
  const meta = (message.metadata || {}) as Record<string, unknown>
  const alt = typeof meta.alt === "string" ? meta.alt : undefined
  const filename = typeof meta.filename === "string" ? meta.filename : "file"

  if (type === "media") {
    try {
      const payload = typeof body === "string" ? JSON.parse(body) : body
      const mediaUrl = typeof payload?.mediaUrl === "string" ? payload.mediaUrl : ""
      const url = getSafeMessageMediaUrl(mediaUrl)
      if (url) {
        return (
          <div className={className} style={style}>
            <img
              src={url}
              alt={typeof payload?.caption === "string" ? payload.caption : "Media"}
              className="max-w-full max-h-[280px] rounded-lg object-contain cursor-pointer"
              loading="lazy"
              onClick={() => onImageClick?.(url)}
            />
          </div>
        )
      }
    } catch {
      // fall through to text
    }
  }

  if (type === "image" || type === "gif") {
    const url = getSafeMessageMediaUrl(body)
    if (!url) {
      return (
        <div className={className} style={style}>
          <p className="text-sm opacity-80">[Unsupported media]</p>
        </div>
      )
    }
    return (
      <div className={className} style={style}>
        <img
          src={url}
          alt={alt || (type === "gif" ? "GIF" : "Image")}
          className="max-w-full max-h-[280px] rounded-lg object-contain cursor-pointer"
          loading="lazy"
          onClick={() => onImageClick?.(url)}
        />
      </div>
    )
  }

  if (type === "file") {
    const url = getSafeMessageMediaUrl(body)
    const displayName = filename || body.split("/").pop() || "Download"
    if (!url) {
      return (
        <div className={className} style={style}>
          <span className="text-sm opacity-80">📎 {displayName}</span>
        </div>
      )
    }
    return (
      <div className={className} style={style}>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm underline break-all"
        >
          📎 {displayName}
        </a>
      </div>
    )
  }

  return (
    <p className="mt-0.5 whitespace-pre-wrap break-words" style={style}>
      {body}
    </p>
  )
}

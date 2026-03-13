"use client"

import { Image as GifIcon, Image as ImageIcon, Film } from "lucide-react"
import { useMediaUpload } from "@/hooks/useMediaUpload"

/**
 * Standalone media composer (GIF, image, video). Use inside a thread context with threadId.
 * League chat uses inline media buttons in LeagueChatPanel; this component is for other views.
 */
export default function MediaComposer({ threadId }: { threadId?: string }) {
  const { uploadGif, uploadImage, uploadVideo } = useMediaUpload(threadId)

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => uploadGif()}
        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors hover:bg-black/5"
        style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
      >
        <GifIcon className="h-3.5 w-3.5" />
        GIF
      </button>
      <button
        type="button"
        onClick={() => uploadImage()}
        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors hover:bg-black/5"
        style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
      >
        <ImageIcon className="h-3.5 w-3.5" />
        Image
      </button>
      <button
        type="button"
        onClick={() => uploadVideo()}
        className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors hover:bg-black/5"
        style={{ borderColor: "var(--border)", color: "var(--muted2)" }}
      >
        <Film className="h-3.5 w-3.5" />
        Video
      </button>
    </div>
  )
}

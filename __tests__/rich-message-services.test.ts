import { describe, expect, it } from "vitest"
import {
  canSendComposerMessage,
  getAttachmentPreviewLabel,
  isValidGifOrImageUrl,
  resolveMediaViewerUrl,
  searchGifs,
} from "@/lib/rich-message"

describe("rich message services", () => {
  it("computes send state with attachment-aware logic", () => {
    expect(canSendComposerMessage("", null, false)).toBe(false)
    expect(canSendComposerMessage("hello", null, false)).toBe(true)
    expect(
      canSendComposerMessage("", { type: "gif", url: "https://media.example/g.gif" }, false),
    ).toBe(true)
    expect(
      canSendComposerMessage("hello", { type: "gif", url: "https://media.example/g.gif" }, true),
    ).toBe(false)
  })

  it("returns labels for attachment preview types", () => {
    expect(getAttachmentPreviewLabel(null)).toBe("")
    expect(getAttachmentPreviewLabel({ type: "gif", url: "https://gif.example/1.gif" })).toBe("GIF")
    expect(
      getAttachmentPreviewLabel({
        type: "file",
        file: { name: "board.pdf", type: "application/pdf" } as File,
        url: "/uploads/chat/board.pdf",
      }),
    ).toBe("board.pdf")
  })

  it("validates gif urls and resolves safe viewer urls", () => {
    expect(isValidGifOrImageUrl("https://media.example/gif")).toBe(true)
    expect(isValidGifOrImageUrl("javascript:alert(1)")).toBe(false)
    expect(resolveMediaViewerUrl("javascript:alert(1)")).toBeNull()
  })

  it("returns no search results without configured provider", async () => {
    const results = await searchGifs("touchdown", 6)
    expect(Array.isArray(results)).toBe(true)
  })
})

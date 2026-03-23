import { describe, expect, it } from "vitest"
import {
  ALLOWED_PROFILE_IMAGE_TYPES,
  parseAvatarDataUrl,
} from "@/lib/avatar/ProfileImageUploadStorageService"

describe("ProfileImageUploadStorageService", () => {
  it("parses a valid base64 avatar data URL", () => {
    const tinyPngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMBAJqLx2sAAAAASUVORK5CYII="
    const parsed = parseAvatarDataUrl(`data:image/png;base64,${tinyPngBase64}`)

    expect(parsed).not.toBeNull()
    expect(parsed?.mimeType).toBe("image/png")
    expect(parsed?.bytes.byteLength).toBeGreaterThan(0)
    expect(parsed?.extension).toBe("png")
  })

  it("rejects unsupported mime types and malformed payloads", () => {
    expect(
      parseAvatarDataUrl("data:image/svg+xml;base64,PHN2Zy8+")
    ).toBeNull()
    expect(parseAvatarDataUrl("not-a-data-url")).toBeNull()
  })

  it("keeps the upload allow-list aligned with app requirements", () => {
    expect(ALLOWED_PROFILE_IMAGE_TYPES).toEqual([
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ])
  })
})

import { describe, expect, it } from "vitest"
import {
  EMOJI_BY_CATEGORY,
  EMOJI_CATEGORIES,
  EMOJI_LIST,
  getEmojiCategoryLabel,
  searchEmojiCatalog,
} from "@/lib/rich-message/EmojiPickerService"

describe("EmojiPickerService", () => {
  it("ships real emoji characters instead of mojibake", () => {
    expect(EMOJI_LIST).toContain("🔥")
    expect(EMOJI_LIST).toContain("⚽")
    expect(EMOJI_LIST.join("")).not.toMatch(/ðŸ|âš|Â/)
  })

  it("exposes category groups for the full picker", () => {
    expect(EMOJI_CATEGORIES).toContain("sports")
    expect(EMOJI_BY_CATEGORY.sports).toEqual(expect.arrayContaining(["⚽", "🏆"]))
    expect(getEmojiCategoryLabel("sports", "es")).toBe("Deportes")
  })

  it("searches category names", () => {
    expect(searchEmojiCatalog("sport")).toEqual(expect.arrayContaining(["⚽", "🏆"]))
  })
})

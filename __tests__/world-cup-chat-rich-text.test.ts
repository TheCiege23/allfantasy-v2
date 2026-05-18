import { describe, expect, it } from "vitest"
import {
  parseWorldCupChatRichText,
  sanitizeWorldCupChatMessage,
} from "@/lib/world-cup/worldCupChatRichText"
import { parseWorldCupPoolMentions } from "@/lib/world-cup/worldCupPoolChatPlan"

describe("worldCupChatRichText", () => {
  it("parses bold safely", () => {
    const segments = parseWorldCupChatRichText("go **USA**")

    expect(segments).toContainEqual(expect.objectContaining({
      text: "USA",
      marks: expect.objectContaining({ bold: true }),
    }))
  })

  it("parses italic safely", () => {
    const segments = parseWorldCupChatRichText("_upset_ watch")

    expect(segments[0]).toMatchObject({ text: "upset", marks: { italic: true, color: "default", font: "default" } })
  })

  it("parses underline safely", () => {
    const segments = parseWorldCupChatRichText("__lock__")

    expect(segments[0]?.marks.underline).toBe(true)
  })

  it("parses strikethrough safely", () => {
    const segments = parseWorldCupChatRichText("~~nope~~")

    expect(segments[0]?.marks.strike).toBe(true)
  })

  it("allows approved colors", () => {
    const segments = parseWorldCupChatRichText("[color=af-blue]Champs[/color]")

    expect(segments[0]).toMatchObject({ text: "Champs", marks: expect.objectContaining({ color: "af-blue" }) })
  })

  it("renders disallowed colors as plain text", () => {
    const segments = parseWorldCupChatRichText("[color=hotpink]Nope[/color]")

    expect(segments.map((segment) => segment.text).join("")).toBe("[color=hotpink]Nope[/color]")
    expect(segments.every((segment) => segment.marks.color === "default")).toBe(true)
  })

  it("allows approved font styles", () => {
    const segments = parseWorldCupChatRichText("[font=mono]table[/font]")

    expect(segments[0]).toMatchObject({ text: "table", marks: expect.objectContaining({ font: "mono" }) })
  })

  it("strips unsafe HTML and script tags without rendering HTML", () => {
    const sanitized = sanitizeWorldCupChatMessage("<script>alert(1)</script><img src=x onerror=bad()>safe")

    expect(sanitized).not.toMatch(/script|img|onerror/i)
    expect(sanitized).toContain("alert(1)")
    expect(sanitized).toContain("safe")
  })

  it("removes inline style attributes", () => {
    const sanitized = sanitizeWorldCupChatMessage('<span style="font-size:999px">giant</span>')

    expect(sanitized).not.toMatch(/style=/i)
    expect(sanitized).toContain("giant")
  })

  it("keeps mention parsing working after formatting", () => {
    const mentions = parseWorldCupPoolMentions("**@alice** and [color=af-blue]@bob[/color]")

    expect(mentions.map((mention) => mention.value)).toEqual(["alice", "bob"])
  })
})

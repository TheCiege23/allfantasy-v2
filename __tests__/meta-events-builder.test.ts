import { describe, expect, it } from "vitest"
import {
  buildMetaEventPayload,
  createDeterministicMetaEventId,
  isMetaStandardPixelEvent,
  normalizeMetaCustomData,
} from "@/lib/meta-events"

describe("Meta event builder", () => {
  it("normalizes required Meta custom data fields", () => {
    const customData = normalizeMetaCustomData(
      { value: "19.995" as unknown as number, currency: "usd" },
      { eventName: "Purchase", contentName: "AF Pro Monthly", contentCategory: "Subscription" }
    )

    expect(customData).toMatchObject({
      value: 20,
      currency: "USD",
      content_name: "AF Pro Monthly",
      content_category: "Subscription",
    })
  })

  it("builds deterministic event ids for server/browser dedupe", () => {
    const first = createDeterministicMetaEventId("Purchase", "stripe_checkout:cs_test_123")
    const second = createDeterministicMetaEventId("Purchase", "stripe_checkout:cs_test_123")

    expect(first).toBe(second)
    expect(first).toContain("Purchase")
    expect(first).toContain("stripe_checkout")
  })

  it("builds a complete event payload", () => {
    const payload = buildMetaEventPayload(
      "Lead",
      { content_name: "World Cup Pool", content_category: "World Cup Pool" },
      { sourceId: "world_cup_pool:abc", deterministic: true }
    )

    expect(payload.eventName).toBe("Lead")
    expect(payload.eventId).toBe(createDeterministicMetaEventId("Lead", "world_cup_pool:abc"))
    expect(payload.customData).toMatchObject({
      value: 0,
      currency: "USD",
      content_name: "World Cup Pool",
      content_category: "World Cup Pool",
    })
  })

  it("separates standard Pixel events from custom Pixel events", () => {
    expect(isMetaStandardPixelEvent("Purchase")).toBe(true)
    expect(isMetaStandardPixelEvent("early_access_click")).toBe(false)
  })
})

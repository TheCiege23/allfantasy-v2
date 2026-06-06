import { beforeEach, describe, expect, it, vi } from "vitest"
import { ensureMetaPixel, trackMetaBrowserEvent } from "@/lib/meta-client"

const META_PIXEL_SCRIPT_SRC = "https://connect.facebook.net/en_US/fbevents.js"
const TEST_PIXEL_ID = "1607977376870461"

function fbqQueue(): unknown[][] {
  return ((window.fbq as typeof window.fbq & { queue?: unknown[][] })?.queue ?? [])
}

describe("Meta browser client", () => {
  beforeEach(() => {
    document.head.innerHTML = ""
    document.body.innerHTML = ""
    window.history.pushState({}, "", "/")
    delete window.fbq
    delete window._fbq
    delete window.__afMetaPixelId
    delete window.__afMetaPixelIds
    vi.restoreAllMocks()
  })

  it("initializes fbq and injects the Meta Pixel script", () => {
    expect(ensureMetaPixel("123456")).toBe(true)

    expect(typeof window.fbq).toBe("function")
    expect(window.__afMetaPixelId).toBe("123456")
    expect(window.__afMetaPixelIds?.has("123456")).toBe(true)
    expect(
      document.querySelector(`script[src="${META_PIXEL_SCRIPT_SRC}"]`)
    ).not.toBeNull()
    expect(fbqQueue()).toContainEqual(["init", "123456"])
  })

  it("uses the initialized fbq for standard browser events", () => {
    expect(ensureMetaPixel(TEST_PIXEL_ID)).toBe(true)

    const tracked = trackMetaBrowserEvent({
      eventName: "ViewContent",
      eventId: "evt_view_content_1",
      customData: {
        content_name: "World Cup Pool",
        content_category: "World Cup Pool",
      },
    })

    expect(tracked).toBe(true)
    expect(window.__afMetaPixelIds?.has(TEST_PIXEL_ID)).toBe(true)
    expect(fbqQueue()).toContainEqual(["init", TEST_PIXEL_ID])
    expect(fbqQueue()).toContainEqual([
      "track",
      "ViewContent",
      expect.objectContaining({
        content_name: "World Cup Pool",
        content_category: "World Cup Pool",
        value: 0,
        currency: "USD",
      }),
      { eventID: "evt_view_content_1" },
    ])
  })

  it("logs production-safe Meta debug output only when requested", () => {
    window.history.pushState({}, "", "/?af_debug_meta=1")
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined)
    expect(ensureMetaPixel(TEST_PIXEL_ID)).toBe(true)

    trackMetaBrowserEvent({
      eventName: "PageView",
      eventId: "evt_page_view_1",
      customData: {
        content_name: "AllFantasy Home",
        content_category: "Page",
      },
    })

    expect(info).toHaveBeenCalledWith("[AF Meta] metaPixelId", TEST_PIXEL_ID)
    expect(info).toHaveBeenCalledWith("[AF Meta] typeof window.fbq", "function")
    expect(info).toHaveBeenCalledWith(
      "[AF Meta] PageView fired",
      expect.objectContaining({
        eventId: "evt_page_view_1",
        typeofFbq: "function",
        contentName: "AllFantasy Home",
        contentCategory: "Page",
      })
    )
  })
})

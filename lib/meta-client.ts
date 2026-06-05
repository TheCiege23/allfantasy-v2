import {
  buildMetaEventPayload,
  isMetaStandardPixelEvent,
  normalizeMetaCustomData,
  type MetaCustomData,
  type MetaEventName,
  type MetaEventPayload,
} from "@/lib/meta-events"

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void
    _fbq?: (...args: unknown[]) => void
  }
}

type MetaResponseCarrier = {
  metaEvent?: MetaEventPayload | null
  metaEvents?: MetaEventPayload[] | Record<string, MetaEventPayload | null | undefined> | null
}

function getCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const prefix = `${name}=`
  return document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix))
    ?.slice(prefix.length)
}

export function ensureMetaPixel(pixelId: string | null | undefined): void {
  if (typeof window === "undefined" || typeof document === "undefined") return
  const id = pixelId?.trim()
  if (!id) return

  if (!window.fbq) {
    const fbq = function fbqShim(...args: unknown[]) {
      const q = fbqShim as typeof fbqShim & {
        callMethod?: (...callArgs: unknown[]) => void
        queue?: unknown[][]
        push?: typeof fbqShim
        loaded?: boolean
        version?: string
      }
      if (q.callMethod) {
        q.callMethod(...args)
      } else {
        q.queue = q.queue ?? []
        q.queue.push(args)
      }
    } as typeof window.fbq & {
      queue?: unknown[][]
      push?: unknown
      loaded?: boolean
      version?: string
    }

    fbq.push = fbq
    fbq.loaded = true
    fbq.version = "2.0"
    fbq.queue = []
    window.fbq = fbq
    window._fbq = fbq

    const script = document.createElement("script")
    script.async = true
    script.src = "https://connect.facebook.net/en_US/fbevents.js"
    const firstScript = document.getElementsByTagName("script")[0]
    firstScript?.parentNode?.insertBefore(script, firstScript)
  }

  const w = window as typeof window & { __afMetaPixelIds?: Set<string> }
  w.__afMetaPixelIds = w.__afMetaPixelIds ?? new Set<string>()
  if (!w.__afMetaPixelIds.has(id)) {
    window.fbq?.("init", id)
    w.__afMetaPixelIds.add(id)
  }
}

export function trackMetaBrowserEvent(event: MetaEventPayload | null | undefined): boolean {
  if (!event?.eventName || !event.eventId) return false
  if (typeof window === "undefined" || typeof window.fbq !== "function") return false
  const command = isMetaStandardPixelEvent(event.eventName) ? "track" : "trackCustom"
  window.fbq(
    command,
    event.eventName,
    normalizeMetaCustomData(event.customData, { eventName: event.eventName }),
    { eventID: event.eventId }
  )
  return true
}

export async function mirrorMetaEventServerSide(
  event: MetaEventPayload,
  options?: { sourceUrl?: string }
): Promise<void> {
  if (typeof window === "undefined") return
  try {
    await fetch("/api/meta/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        event_name: event.eventName,
        event_id: event.eventId,
        custom_data: event.customData,
        source_url: options?.sourceUrl ?? window.location.href,
        fbp: getCookieValue("_fbp"),
        fbc: getCookieValue("_fbc"),
      }),
    })
  } catch {
    // Best-effort mirror only; browser Pixel still carries the event.
  }
}

export function trackMetaEventAndMirror(
  eventName: MetaEventName | string,
  customData?: MetaCustomData | null,
  options?: {
    eventId?: string
    sourceId?: string | null
    deterministic?: boolean
    sourceUrl?: string
    contentName?: string
    contentCategory?: string
  }
): MetaEventPayload {
  const event = buildMetaEventPayload(eventName, customData, options)
  trackMetaBrowserEvent(event)
  void mirrorMetaEventServerSide(event, { sourceUrl: options?.sourceUrl })
  return event
}

export function collectMetaEventsFromResponse(payload: unknown): MetaEventPayload[] {
  const carrier = payload as MetaResponseCarrier | null | undefined
  if (!carrier || typeof carrier !== "object") return []

  const events: MetaEventPayload[] = []
  if (carrier.metaEvent) events.push(carrier.metaEvent)
  if (Array.isArray(carrier.metaEvents)) {
    events.push(...carrier.metaEvents.filter(Boolean))
  } else if (carrier.metaEvents && typeof carrier.metaEvents === "object") {
    events.push(...Object.values(carrier.metaEvents).filter(Boolean) as MetaEventPayload[])
  }
  return events.filter((event) => Boolean(event?.eventName && event?.eventId))
}

export function trackMetaEventsFromResponse(payload: unknown): void {
  for (const event of collectMetaEventsFromResponse(payload)) {
    trackMetaBrowserEvent(event)
  }
}

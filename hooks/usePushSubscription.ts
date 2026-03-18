"use client"

import { useCallback, useState } from "react"

export type PushPermissionState = "default" | "granted" | "denied" | "unsupported"

export interface UsePushSubscriptionResult {
  permission: PushPermissionState
  isSubscribed: boolean
  isLoading: boolean
  error: string | null
  requestAndSubscribe: () => Promise<boolean>
  unsubscribe: () => Promise<void>
}

const SW_PATH = "/sw-push.js"

/**
 * Hook to request notification permission and subscribe to web push.
 * Call requestAndSubscribe() after user gesture (e.g. Enable button in settings).
 */
export function usePushSubscription(): UsePushSubscriptionResult {
  const [permission, setPermission] = useState<PushPermissionState>("default")
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const requestAndSubscribe = useCallback(async (): Promise<boolean> => {
    setError(null)
    setIsLoading(true)
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
        setPermission("unsupported")
        setError("Push notifications are not supported in this browser.")
        return false
      }

      const perm = await Notification.requestPermission()
      setPermission(perm === "granted" ? "granted" : perm === "denied" ? "denied" : "default")
      if (perm !== "granted") {
        setError(perm === "denied" ? "Permission denied." : "Permission not granted.")
        return false
      }

      const reg = await navigator.serviceWorker.register(SW_PATH, { scope: "/" })
      await reg.update()
      const keyStr = await getVapidPublicKey()
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyStr) as BufferSource,
      })

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: sub.endpoint,
          keys: {
            p256dh: arrayBufferToBase64(sub.getKey("p256dh")!),
            auth: arrayBufferToBase64(sub.getKey("auth")!),
          },
          userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Failed to save subscription")
      }
      setIsSubscribed(true)
      return true
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to enable push"
      setError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setError(null)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setIsSubscribed(false)
    } catch {
      setError("Failed to unsubscribe")
    }
  }, [])

  return {
    permission,
    isSubscribed,
    isLoading,
    error,
    requestAndSubscribe,
    unsubscribe,
  }
}

async function getVapidPublicKey(): Promise<string> {
  const res = await fetch("/api/push/vapid-public-key", { cache: "no-store" })
  if (!res.ok) throw new Error("Push not configured")
  const data = await res.json()
  const key = data?.publicKey
  if (!key) throw new Error("Missing VAPID public key")
  return key
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return typeof btoa !== "undefined" ? btoa(binary) : Buffer.from(bytes).toString("base64")
}

/** Decode base64url or base64 VAPID public key to Uint8Array for pushManager.subscribe. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

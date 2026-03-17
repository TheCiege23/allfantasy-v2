"use client"

import { useEffect, useRef } from "react"

/**
 * When the page loads with ?ref=CODE, call track-click to record the click and set af_ref cookie
 * so that signup can attribute the new user to the referrer.
 */
export function ReferralTracker() {
  const done = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined" || done.current) return
    const params = new URLSearchParams(window.location.search)
    const ref = params.get("ref")?.trim()
    if (!ref) return
    done.current = true
    fetch("/api/referral/track-click", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ref }),
      credentials: "same-origin",
    }).catch(() => {})
  }, [])

  return null
}

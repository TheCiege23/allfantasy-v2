"use client"

import { useState, useEffect, useCallback } from "react"
import type { UserProfileForSettings, ProfileUpdatePayload } from "@/lib/user-settings"

export function useSettingsProfile() {
  const [profile, setProfile] = useState<UserProfileForSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProfile = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/user/profile", { cache: "no-store" })
      const data = await res.json()
      if (!res.ok) {
        setProfile(null)
        return
      }
      if (data.userId) {
        setProfile(data as UserProfileForSettings)
      } else {
        setProfile(null)
      }
    } catch (e) {
      setError("Failed to load profile")
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const updateProfile = useCallback(
    async (payload: ProfileUpdatePayload) => {
      setSaving(true)
      setError(null)
      try {
        const res = await fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) {
          setError(data?.error ?? "Failed to save")
          return false
        }
        await fetchProfile()
        return true
      } catch (e) {
        setError("Failed to save")
        return false
      } finally {
        setSaving(false)
      }
    },
    [fetchProfile]
  )

  return { profile, loading, saving, error, fetchProfile, updateProfile }
}

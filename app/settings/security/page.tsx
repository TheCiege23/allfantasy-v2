"use client"

import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { useSettingsProfile } from "@/hooks/useSettingsProfile"
import { ErrorStateRenderer, LoadingStateRenderer } from "@/components/ui-states"
import { SecuritySettingsSection } from "../components/sections/SecuritySettingsSection"
import type { SettingsProfile } from "../components/sections/settings-types"

export default function SecuritySettingsPage() {
  const { profile, loading, error, fetchProfile } = useSettingsProfile()

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-[#07071a] px-4 py-10">
        <LoadingStateRenderer label="Loading…" testId="settings-security-loading" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#07071a] px-4 py-10">
        <ErrorStateRenderer
          title="Unable to load security settings"
          message={error ?? "Try again."}
          onRetry={() => void fetchProfile()}
          testId="settings-security-error"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#07071a] px-4 py-8 text-white">
      <div className="mx-auto max-w-xl">
        <Link
          href="/settings"
          className="mb-6 inline-flex items-center gap-2 text-sm text-cyan-400/90 hover:text-cyan-300"
        >
          <ArrowLeft className="h-4 w-4" />
          ← Settings
        </Link>
        <h1 className="mb-6 text-xl font-bold">Security</h1>
        <SecuritySettingsSection profile={profile as SettingsProfile} onRefetch={fetchProfile} />
      </div>
    </div>
  )
}

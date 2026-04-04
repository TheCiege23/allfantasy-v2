"use client"

import { useState, useEffect } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ReferralSection } from "@/components/settings/ReferralSection"
import { useSettingsProfile } from "@/hooks/useSettingsProfile"
import { ErrorStateRenderer, LoadingStateRenderer } from "@/components/ui-states"
import { resolveRecoveryActions } from "@/lib/ui-state"
import { SettingsChrome, isSettingsTabId, type SettingsTabId } from "./SettingsChrome"
import {
  ProfileSettingsSection,
  PreferencesSettingsSection,
  SecuritySettingsSection,
  NotificationsSettingsSection,
  ConnectedAccountsSettingsSection,
  LegacyImportSettingsSection,
  LegalSettingsSection,
  AccountSettingsSection,
  BillingSettingsSection,
} from "./sections"

export type SettingsAppProps = {
  uploadLeagueId: string | null
  accountCreatedAt: string | null
  planLabel: string | null
}

export default function SettingsApp({
  uploadLeagueId,
  accountCreatedAt,
  planLabel,
}: SettingsAppProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const tabFromQuery = searchParams?.get("tab")
  const initialTab = isSettingsTabId(tabFromQuery) ? tabFromQuery : "profile"
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab)
  const { profile, loading, saving, error, updateProfile, fetchProfile } = useSettingsProfile()

  useEffect(() => {
    if (!isSettingsTabId(tabFromQuery)) return
    if (tabFromQuery !== activeTab) {
      setActiveTab(tabFromQuery)
    }
  }, [tabFromQuery, activeTab])

  const handleTabSelect = (tabId: SettingsTabId) => {
    setActiveTab(tabId)
    const params = new URLSearchParams(searchParams?.toString() ?? "")
    params.set("tab", tabId)
    router.replace(`${pathname}?${params.toString()}`, { scroll: false })
  }

  if (loading && !profile) {
    return (
      <div className="min-h-[100dvh] bg-[#0d1117] px-4 py-8">
        <LoadingStateRenderer label="Loading settings..." testId="settings-loading-state" />
      </div>
    )
  }

  if (!loading && !profile) {
    return (
      <div className="min-h-[100dvh] bg-[#0d1117] px-4 py-8">
        <ErrorStateRenderer
          title="Unable to load settings"
          message={error ?? "Settings are currently unavailable. Retry to recover your profile state."}
          onRetry={() => void fetchProfile()}
          actions={resolveRecoveryActions("settings").map((action) => ({
            id: action.id,
            label: action.label,
            href: action.href,
          }))}
          testId="settings-error-state"
        />
      </div>
    )
  }

  return (
    <SettingsChrome activeTab={activeTab} onTabChange={handleTabSelect}>
      {error && (
        <div className="mb-4">
          <ErrorStateRenderer
            compact
            title="Some settings did not refresh"
            message={error}
            onRetry={() => void fetchProfile()}
            testId="settings-inline-error-state"
          />
        </div>
      )}
      {activeTab === "profile" && (
        <ProfileSettingsSection
          profile={profile}
          saving={saving}
          onSave={updateProfile}
          onRefetch={fetchProfile}
          uploadLeagueId={uploadLeagueId}
        />
      )}
      {activeTab === "preferences" && (
        <PreferencesSettingsSection profile={profile} saving={saving} onSave={updateProfile} />
      )}
      {activeTab === "security" && <SecuritySettingsSection profile={profile} onRefetch={fetchProfile} />}
      {activeTab === "notifications" && (
        <NotificationsSettingsSection profile={profile} onRefetch={fetchProfile} />
      )}
      {activeTab === "connected" && (
        <ConnectedAccountsSettingsSection profile={profile} onRefetchProfile={fetchProfile} />
      )}
      {activeTab === "billing" && <BillingSettingsSection />}
      {activeTab === "referral" && <ReferralSection />}
      {activeTab === "legacy" && <LegacyImportSettingsSection />}
      {activeTab === "legal" && <LegalSettingsSection profile={profile} />}
      {activeTab === "account" && (
        <AccountSettingsSection accountCreatedAt={accountCreatedAt} planLabel={planLabel} />
      )}
    </SettingsChrome>
  )
}

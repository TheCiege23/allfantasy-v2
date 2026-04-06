"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { DiscordIcon } from "@/app/components/icons/DiscordIcon"
import { discordAvatarUrl } from "@/lib/discord/avatar"
import {
  getConnectedAccounts,
  disconnectConnectedAccount,
  getProviderConnectAction,
  getFallbackViewMessage,
  canDisconnectProvider,
  getDisconnectBlockedMessage,
  type SignInProviderId,
  type ProviderStatus,
} from "@/lib/connected-accounts"
import { ConnectedIdentityRenderer } from "@/components/connected-accounts/ConnectedIdentityRenderer"
import type { SettingsProfile } from "./settings-types"

const IMPORT_PLATFORMS: { id: string; name: string; hint: string }[] = [
  { id: "yahoo", name: "Yahoo Fantasy", hint: "League import & account linking" },
  { id: "espn", name: "ESPN", hint: "League import & account linking" },
  { id: "mfl", name: "MyFantasyLeague (MFL)", hint: "League import" },
  { id: "fleaflicker", name: "Fleaflicker", hint: "League import" },
  { id: "fantrax", name: "Fantrax", hint: "League import" },
]

export function ConnectedAccountsSettingsSection({
  profile,
  onRefetchProfile,
}: {
  profile: SettingsProfile
  onRefetchProfile: () => void
}) {
  const [providers, setProviders] = useState<ProviderStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [busyProviderId, setBusyProviderId] = useState<SignInProviderId | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [statusTone, setStatusTone] = useState<"info" | "error" | "success" | null>(null)

  const linkedProvidersCount = providers.filter((provider) => provider.linked).length
  const hasPassword = !!profile?.hasPassword

  const loadProviders = async (asRefresh = false) => {
    if (asRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      if (asRefresh) onRefetchProfile()
      const data = await getConnectedAccounts()
      setProviders(data.providers)
    } catch {
      setStatusTone("error")
      setStatusMessage("Could not load connected providers right now.")
    } finally {
      if (asRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }

  useEffect(() => {
    loadProviders()
  }, [])

  useEffect(() => {
    const onFocus = () => {
      void loadProviders(true)
    }
    if (typeof window !== "undefined") {
      window.addEventListener("focus", onFocus)
      return () => window.removeEventListener("focus", onFocus)
    }
  }, [])

  const handleConnect = (providerId: SignInProviderId, configured: boolean) => {
    const action = getProviderConnectAction(providerId, configured)
    if (action === "fallback") {
      setStatusTone("info")
      setStatusMessage(getFallbackViewMessage(providerId))
      return
    }
    setStatusMessage(null)
    setStatusTone(null)
    setBusyProviderId(providerId)
    void signIn(providerId, { callbackUrl: "/settings?tab=connected" }).finally(() => {
      setBusyProviderId(null)
    })
  }

  const handleDisconnectSleeper = async () => {
    if (typeof window !== "undefined" && !window.confirm("Disconnect your Sleeper account from AllFantasy?")) return
    const res = await fetch("/api/user/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ disconnectSleeper: true }),
    })
    if (res.ok) {
      onRefetchProfile()
      await loadProviders(true)
    }
  }

  const handleDisconnectDiscord = async () => {
    const res = await fetch("/api/auth/discord/disconnect", { method: "POST" })
    if (res.ok) {
      onRefetchProfile()
      await loadProviders(true)
    }
  }

  const handleDisconnect = async (provider: ProviderStatus) => {
    if (!canDisconnectProvider(provider, linkedProvidersCount, hasPassword)) {
      setStatusTone("error")
      setStatusMessage(getDisconnectBlockedMessage(provider.id))
      return
    }
    if (typeof window !== "undefined") {
      const shouldDisconnect = window.confirm(`Disconnect ${provider.name} from your sign-in methods?`)
      if (!shouldDisconnect) return
    }
    setBusyProviderId(provider.id)
    setStatusMessage(null)
    setStatusTone(null)
    const result = await disconnectConnectedAccount(provider.id)
    setBusyProviderId(null)
    if (!result.ok) {
      setStatusTone("error")
      if (result.error === "LOCKOUT_RISK") {
        setStatusMessage("Disconnect blocked to prevent account lockout. Add another provider or password first.")
      } else {
        setStatusMessage("Could not disconnect provider right now.")
      }
      return
    }
    if (result.providers && result.providers.length > 0) {
      setProviders(result.providers)
    } else {
      await loadProviders(true)
    }
    setStatusTone("success")
    setStatusMessage(`${provider.name} disconnected.`)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Connected Accounts</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Link sign-in providers (Google, Apple, and more), Discord for chat features, and fantasy platforms for league
          import.
        </p>
      </div>
      {statusMessage && (
        <div
          className="rounded-xl border px-3 py-2 text-sm"
          style={{
            borderColor: statusTone === "error" ? "var(--accent-red)" : "var(--accent-cyan)",
            background:
              statusTone === "error"
                ? "color-mix(in srgb, var(--accent-red) 10%, transparent)"
                : statusTone === "success"
                  ? "color-mix(in srgb, #10b981 16%, transparent)"
                  : "color-mix(in srgb, var(--accent-cyan) 12%, transparent)",
            color: "var(--text)",
          }}
        >
          {statusMessage}
        </div>
      )}
      <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium" style={{ color: "var(--muted2)" }}>Sign-in providers</p>
          <button
            type="button"
            onClick={() => void loadProviders(true)}
            disabled={refreshing}
            className="rounded-lg border px-3 py-1.5 text-xs font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            {refreshing ? "Refreshing…" : "Refresh status"}
          </button>
        </div>
        {loading ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Loading…</p>
        ) : (
          <ul className="space-y-3">
            {providers.map((provider) => (
              <li key={provider.id} className="flex flex-wrap items-center justify-between gap-2">
                <ConnectedIdentityRenderer provider={provider} size="md" />
                {!provider.linked ? (
                  <button
                    type="button"
                    onClick={() => handleConnect(provider.id, provider.configured)}
                    disabled={busyProviderId === provider.id}
                    className="rounded-lg border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    {busyProviderId === provider.id ? "Connecting…" : "Connect"}
                  </button>
                ) : canDisconnectProvider(provider, linkedProvidersCount, hasPassword) ? (
                  <button
                    type="button"
                    onClick={() => void handleDisconnect(provider)}
                    disabled={busyProviderId === provider.id}
                    className="rounded-lg border px-3 py-2 text-sm font-medium"
                    style={{ borderColor: "var(--accent-red)", color: "var(--accent-red-strong)" }}
                  >
                    {busyProviderId === provider.id ? "Disconnecting…" : "Disconnect"}
                  </button>
                ) : (
                  <span className="text-xs" style={{ color: "var(--muted)" }}>Connected (protected)</span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          To prevent lockout, your last linked provider cannot be disconnected unless you have a password set.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--muted2)" }}>Discord</p>
        {!profile?.discordUserId ? (
          <div className="space-y-3">
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Connect Discord to show your Discord avatar and unlock league chat sync (bot features when enabled on this
              deployment).
            </p>
            <a
              href="/api/auth/discord"
              data-testid="settings-connect-discord"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium"
              style={{ borderColor: "#5865F2", background: "color-mix(in srgb, #5865F2 18%, transparent)", color: "var(--text)" }}
            >
              <DiscordIcon size={16} className="text-[#5865F2]" />
              Connect Discord
            </a>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <img
                src={discordAvatarUrl(profile.discordUserId, profile.discordAvatar)}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium" style={{ color: "var(--text)" }}>
                  {profile.discordUsername ?? "Discord"}
                </p>
                <p className="truncate text-xs" style={{ color: "var(--muted)" }}>
                  {profile.discordEmail ?? "Connected"}
                </p>
              </div>
            </div>
            <button
              type="button"
              data-testid="settings-disconnect-discord"
              onClick={() => void handleDisconnectDiscord()}
              className="rounded-lg border px-3 py-2 text-xs font-medium"
              style={{ borderColor: "var(--accent-red)", color: "var(--accent-red-strong)" }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--muted2)" }}>Fantasy platforms & import</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          Link Sleeper for rankings and imports. Use Import for Yahoo, ESPN, MFL, Fleaflicker, and Fantrax leagues.
        </p>
        <ul className="space-y-3">
          <li className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
            <div>
              <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Sleeper</span>
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {profile?.sleeperUsername ? `Linked as @${profile.sleeperUsername}` : "Not linked"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {profile?.sleeperUsername ? (
                <>
                  <span className="text-xs text-emerald-500">Linked</span>
                  <button
                    type="button"
                    onClick={() => void handleDisconnectSleeper()}
                    className="rounded-lg border px-3 py-2 text-xs font-medium"
                    style={{ borderColor: "var(--border)", color: "var(--text)" }}
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <Link
                  href="/settings/connect/sleeper"
                  className="rounded-lg border px-3 py-2 text-sm font-medium"
                  style={{ borderColor: "var(--border)", color: "var(--text)" }}
                >
                  Connect Sleeper
                </Link>
              )}
            </div>
          </li>
          {IMPORT_PLATFORMS.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-sm font-medium" style={{ color: "var(--text)" }}>{p.name}</span>
                <p className="text-xs" style={{ color: "var(--muted)" }}>{p.hint}</p>
              </div>
              <Link
                href="/import"
                className="shrink-0 rounded-lg border px-3 py-2 text-xs font-medium"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Open Import
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2 pt-1">
          <Link
            href="/legacy-import"
            className="rounded-lg border px-3 py-2 text-xs font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Legacy / dynasty import
          </Link>
          <Link
            href="/import"
            className="rounded-lg border px-3 py-2 text-xs font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text)" }}
          >
            Import hub
          </Link>
        </div>
      </div>
    </div>
  )
}

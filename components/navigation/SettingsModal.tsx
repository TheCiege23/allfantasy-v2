"use client"

import { useState } from "react"
import { X, User, Settings, Users, Shield, Bell, Bot, Slash } from "lucide-react"

type TabId =
  | "profile"
  | "account"
  | "friends"
  | "privacy"
  | "notifications"
  | "ai"
  | "blocked"

const TABS: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: Settings },
  { id: "friends", label: "Friends", icon: Users },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "ai", label: "AI Settings", icon: Bot },
  { id: "blocked", label: "Blocked Users", icon: Slash },
]

export interface SettingsModalProps {
  open: boolean
  onClose: () => void
  username?: string | null
}

export default function SettingsModal({ open, onClose, username }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<TabId>("profile")

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-3"
      style={{ background: "var(--overlay)" }}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-xl max-h-[90vh]"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--panel) 92%, transparent)" }}
      >
        <header className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              Settings
            </h2>
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Manage your AllFantasy profile, account, privacy, and AI preferences.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border text-xs"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--panel2) 88%, transparent)",
              color: "var(--muted)",
            }}
            aria-label="Close settings"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="flex flex-1 flex-col md:flex-row">
          {/* Tabs */}
          <nav className="border-b md:border-b-0 md:border-r md:min-w-[190px]" style={{ borderColor: "var(--border)" }}>
            <ul className="flex md:flex-col overflow-x-auto text-xs">
              {TABS.map((tab) => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <li key={tab.id}>
                    <button
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left whitespace-nowrap"
                      style={{
                        color: active ? "var(--text)" : "var(--muted2)",
                        background: active ? "color-mix(in srgb, var(--panel2) 84%, transparent)" : "transparent",
                      }}
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg border text-[11px]" style={{ borderColor: "var(--border)" }}>
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="font-medium tracking-tight">{tab.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Content */}
          <section className="flex-1 overflow-y-auto px-4 py-4 text-xs md:px-6 md:py-5 space-y-4">
            {activeTab === "profile" && <ProfileSettings username={username ?? undefined} />}
            {activeTab === "account" && <AccountSettings />}
            {activeTab === "friends" && <FriendsSettings />}
            {activeTab === "privacy" && <PrivacySettings />}
            {activeTab === "notifications" && <NotificationSettings />}
            {activeTab === "ai" && <AiSettings />}
            {activeTab === "blocked" && <BlockedUsersSettings />}
          </section>
        </div>
      </div>
    </div>
  )
}

function ProfileSettings({ username }: { username?: string }) {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
      }}
    >
      <div>
        <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--text)" }}>
          Profile
        </h3>
        <p className="text-[11px]" style={{ color: "var(--muted)" }}>
          Update how you appear across AllFantasy products. Changes here will apply to both the Sports App and Bracket.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-full border flex items-center justify-center text-sm font-semibold" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          {username?.charAt(0).toUpperCase() || "A"}
        </div>
        <div className="space-y-1 text-[11px]">
          <div style={{ color: "var(--text)" }}>{username || "Your username"}</div>
          <button
            type="button"
            className="inline-flex items-center rounded-lg border px-2 py-1"
            style={{ borderColor: "var(--border)", color: "var(--muted2)", background: "color-mix(in srgb, var(--panel2) 84%, transparent)" }}
          >
            Change avatar
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px]" style={{ color: "var(--muted2)" }}>
            Username
          </label>
          <input
            type="text"
            defaultValue={username}
            className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            placeholder="your_username"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px]" style={{ color: "var(--muted2)" }}>
            Favorite sports
          </label>
          <input
            type="text"
            className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            placeholder="NFL, NBA, MLB…"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px]" style={{ color: "var(--muted2)" }}>
            Favorite teams
          </label>
          <input
            type="text"
            className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            placeholder="49ers, Celtics…"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px]" style={{ color: "var(--muted2)" }}>
            Favorite players
          </label>
          <input
            type="text"
            className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            placeholder="CMC, Jokic…"
          />
        </div>
      </div>

      <div className="pt-2">
        <button
          type="submit"
          className="inline-flex items-center rounded-xl px-4 py-2 text-xs font-semibold"
          style={{
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
            color: "var(--on-accent-bg)",
          }}
        >
          Save profile
        </button>
      </div>
    </form>
  )
}

function AccountSettings() {
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
      }}
    >
      <div>
        <h3 className="text-sm font-semibold mb-1.5" style={{ color: "var(--text)" }}>
          Account
        </h3>
        <p className="text-[11px]" style={{ color: "var(--muted)" }}>
          Manage how you sign in to AllFantasy. These settings apply across all products.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="mb-1 block text-[11px]" style={{ color: "var(--muted2)" }}>
            Email
          </label>
          <input
            type="email"
            className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px]" style={{ color: "var(--muted2)" }}>
            Phone
          </label>
          <input
            type="tel"
            className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            placeholder="+1 (555) 123-4567"
          />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div>
          <label className="mb-1 block text-[11px]" style={{ color: "var(--muted2)" }}>
            Current password
          </label>
          <input
            type="password"
            className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px]" style={{ color: "var(--muted2)" }}>
            New password
          </label>
          <input
            type="password"
            className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            placeholder="••••••••"
          />
        </div>
        <div>
          <label className="mb-1 block text-[11px]" style={{ color: "var(--muted2)" }}>
            Confirm new password
          </label>
          <input
            type="password"
            className="w-full rounded-xl border px-3 py-2 text-xs outline-none"
            style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
            placeholder="••••••••"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          type="submit"
          className="inline-flex items-center rounded-xl px-4 py-2 text-xs font-semibold"
          style={{
            background: "linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))",
            color: "var(--on-accent-bg)",
          }}
        >
          Save account settings
        </button>
        <button
          type="button"
          className="text-[11px] font-medium rounded-lg px-3 py-2 border"
          style={{
            borderColor: "color-mix(in srgb, var(--accent-red) 60%, var(--border))",
            color: "var(--accent-red-strong)",
            background: "color-mix(in srgb, var(--accent-red) 10%, transparent)",
          }}
        >
          Log out
        </button>
      </div>
    </form>
  )
}

function FriendsSettings() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        Friends
      </h3>
      <p className="text-[11px]" style={{ color: "var(--muted)" }}>
        Manage how friends can find you on AllFantasy. Future updates will let you connect contacts and
        control visibility across leagues, brackets, and the Sports App.
      </p>
      <div className="space-y-2 text-[11px]">
        <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <span>Allow friend requests</span>
          <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/30 bg-black/30" />
        </label>
        <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <span>Show my profile in friend search</span>
          <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/30 bg-black/30" />
        </label>
      </div>
    </div>
  )
}

function PrivacySettings() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        Privacy
      </h3>
      <p className="text-[11px]" style={{ color: "var(--muted)" }}>
        Control how your activity and profile appear across AllFantasy products.
      </p>
      <div className="space-y-2 text-[11px]">
        <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <span>Show brackets to friends by default</span>
          <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/30 bg-black/30" />
        </label>
        <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <span>Share fantasy resume in league lobbies</span>
          <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/30 bg-black/30" />
        </label>
      </div>
    </div>
  )
}

function NotificationSettings() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        Notifications
      </h3>
      <p className="text-[11px]" style={{ color: "var(--muted)" }}>
        Choose which AllFantasy events can notify you. These settings will apply to both Bracket and the Sports App.
      </p>
      <div className="space-y-2 text-[11px]">
        <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <span>Bracket upset alerts</span>
          <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/30 bg-black/30" />
        </label>
        <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <span>Trade recommendations</span>
          <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/30 bg-black/30" />
        </label>
        <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <span>Waiver AI suggestions</span>
          <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/30 bg-black/30" />
        </label>
      </div>
    </div>
  )
}

function AiSettings() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        AI Settings
      </h3>
      <p className="text-[11px]" style={{ color: "var(--muted)" }}>
        Control how AllFantasy&apos;s AI assistant behaves and which providers it can use to personalize your advice.
      </p>
      <div className="space-y-2 text-[11px]">
        <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <span>Use connected fantasy leagues for suggestions</span>
          <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/30 bg-black/30" />
        </label>
        <label className="flex items-center justify-between rounded-xl border px-3 py-2" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
          <span>Show higher‑risk bracket paths</span>
          <input type="checkbox" className="h-3.5 w-3.5 rounded border-white/30 bg-black/30" />
        </label>
      </div>
    </div>
  )
}

function BlockedUsersSettings() {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
        Blocked Users
      </h3>
      <p className="text-[11px]" style={{ color: "var(--muted)" }}>
        Manage who you’ve blocked from messaging or challenging you in AllFantasy.
      </p>
      <div className="rounded-xl border px-3 py-4 text-[11px]" style={{ borderColor: "var(--border)", background: "var(--panel2)" }}>
        <p className="text-[11px]" style={{ color: "var(--muted2)" }}>
          You haven&apos;t blocked anyone yet. When you block a user, they won&apos;t be able to DM you, invite you to
          private leagues, or see your social activity.
        </p>
      </div>
    </div>
  )
}


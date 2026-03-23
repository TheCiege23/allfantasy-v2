"use client"

import Link from "next/link"
import {
  Bell,
  Check,
  CheckCheck,
  MessageSquare,
  Megaphone,
  Handshake,
  Mail,
  AtSign,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"
import type { PlatformNotification } from "@/types/platform-shared"
import { useUserTimezone } from "@/hooks/useUserTimezone"

type GroupKey = "today" | "yesterday" | "earlier"

function getGroup(dateStr: string): GroupKey {
  const d = new Date(dateStr)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)
  if (d >= startOfToday) return "today"
  if (d >= startOfYesterday) return "yesterday"
  return "earlier"
}

function groupNotifications(notifications: PlatformNotification[]): Record<GroupKey, PlatformNotification[]> {
  const groups: Record<GroupKey, PlatformNotification[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  }
  for (const n of notifications) {
    groups[getGroup(n.createdAt)].push(n)
  }
  return groups
}

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  mention: AtSign,
  trade_offer: Handshake,
  league_invite: Mail,
  announcement: Megaphone,
  chat_message: MessageSquare,
  trade: Handshake,
  notification: Bell,
}

function getIcon(type: string) {
  return TYPE_ICONS[type] ?? Bell
}

function formatTime(
  iso: string,
  formatTimeInTimezone: (date: Date | string | number) => string,
  formatDateInTimezone: (date: Date | string | number) => string
): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return "Just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return formatTimeInTimezone(iso)
  if (diff < 172800000) return "Yesterday"
  return formatDateInTimezone(iso)
}

export default function NotificationsPage() {
  const { formatTimeInTimezone, formatDateInTimezone } = useUserTimezone()
  const { notifications, loading, markAsRead, markAllAsRead } = useNotifications(100)
  const groups = groupNotifications(notifications)
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/app/home"
            className="inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs font-medium transition-colors hover:bg-black/5"
            style={{ borderColor: "var(--border)", color: "var(--muted)" }}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Link>
          <h1 className="text-lg font-semibold" style={{ color: "var(--text)" }}>
            Notifications
          </h1>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead()}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-black/5"
            style={{ borderColor: "var(--border)", color: "var(--accent-cyan-strong)" }}
          >
            <CheckCheck className="h-4 w-4" />
            Mark all read
          </button>
        )}
      </header>

      <div
        className="rounded-2xl border"
        style={{ borderColor: "var(--border)", background: "var(--panel)" }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin" style={{ color: "var(--muted)" }} />
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: "var(--muted)" }}>
            No notifications yet.
          </div>
        ) : (
          <>
            {(["today", "yesterday", "earlier"] as const).map((key) => {
              const items = groups[key]
              if (items.length === 0) return null
              const label = key === "today" ? "Today" : key === "yesterday" ? "Yesterday" : "Earlier"
              return (
                <div key={key} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
                  <div
                    className="sticky top-0 z-10 px-4 py-2 text-xs font-semibold uppercase tracking-wider"
                    style={{ background: "var(--panel)", color: "var(--muted)" }}
                  >
                    {label}
                  </div>
                  <ul>
                    {items.map((n) => {
                      const Icon = getIcon(n.type)
                      const leagueId = (n.meta?.leagueId as string) ?? null
                      const chatThreadId = (n.meta?.chatThreadId as string) ?? null
                      return (
                        <li
                          key={n.id}
                          className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-black/5"
                          style={{
                            background: n.read ? "transparent" : "color-mix(in srgb, var(--accent-cyan-strong) 8%, transparent)",
                          }}
                        >
                          <div
                            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                            style={{
                              background: "var(--panel2)",
                              border: "1px solid var(--border)",
                              color: "var(--muted2)",
                            }}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium" style={{ color: "var(--text)" }}>
                              {n.title}
                            </p>
                            {n.body && (
                              <p className="mt-0.5 text-xs" style={{ color: "var(--muted2)" }}>
                                {n.body}
                              </p>
                            )}
                            <p className="mt-1 text-[11px]" style={{ color: "var(--muted)" }}>
                              {formatTime(n.createdAt, formatTimeInTimezone, formatDateInTimezone)}
                            </p>
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              {!n.read && (
                                <button
                                  type="button"
                                  onClick={() => markAsRead(n.id)}
                                  className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium"
                                  style={{ color: "var(--accent-cyan-strong)" }}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  Mark read
                                </button>
                              )}
                              {leagueId && (
                                <Link
                                  href={`/app/league/${leagueId}`}
                                  className="inline-flex items-center gap-1 text-xs font-medium"
                                  style={{ color: "var(--accent-cyan-strong)" }}
                                >
                                  Open league
                                </Link>
                              )}
                              {chatThreadId && (
                                <Link
                                  href={`/messages?thread=${chatThreadId}`}
                                  className="inline-flex items-center gap-1 text-xs font-medium"
                                  style={{ color: "var(--accent-cyan-strong)" }}
                                >
                                  <MessageSquare className="h-3.5 w-3.5" />
                                  Open chat
                                </Link>
                              )}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )
            })}
          </>
        )}
      </div>
    </main>
  )
}

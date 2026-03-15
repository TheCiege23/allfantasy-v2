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
  AlertCircle,
} from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"
import type { PlatformNotification } from "@/types/platform-shared"
import {
  groupNotifications,
  NOTIFICATION_GROUP_LABELS,
  getNotificationDestination,
} from "@/lib/notification-center"
import type { NotificationGroupKey } from "@/lib/notification-center"

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

function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return "Just now"
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
  if (diff < 172800000) return "Yesterday"
  return d.toLocaleDateString()
}

export default function NotificationPanel({ onClose }: { onClose?: () => void }) {
  const { notifications, loading, error, markAsRead, markAllAsRead } = useNotifications(40)
  const groups = groupNotifications(notifications)
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div
      className="flex w-[min(380px,calc(100vw-1rem))] flex-col rounded-xl border shadow-lg"
      style={{
        borderColor: "var(--border)",
        background: "var(--panel)",
      }}
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2.5" style={{ borderColor: "var(--border)" }}>
        <h2 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Notifications
        </h2>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead()}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium transition-colors hover:bg-black/5"
            style={{ color: "var(--accent-cyan-strong)" }}
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </header>

      <div className="max-h-[min(70vh,420px)] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" style={{ color: "var(--muted)" }} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 px-4 text-center">
            <AlertCircle className="h-8 w-8" style={{ color: "var(--muted)" }} />
            <p className="text-[11px]" style={{ color: "var(--muted)" }}>{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-8 text-center text-[11px]" style={{ color: "var(--muted)" }}>
            No notifications yet.
          </div>
        ) : (
          <>
            {(["today", "yesterday", "earlier"] as const).map((key: NotificationGroupKey) => {
              const items = groups[key]
              if (items.length === 0) return null
              const label = NOTIFICATION_GROUP_LABELS[key]
              return (
                <div key={key} className="border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
                  <div
                    className="sticky top-0 z-10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: "var(--panel)", color: "var(--muted)" }}
                  >
                    {label}
                  </div>
                  <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {items.map((n) => {
                      const Icon = getIcon(n.type)
                      const dest = getNotificationDestination(n)
                      const rowClassName = "group flex items-start gap-2 px-3 py-2 transition-colors hover:bg-black/5"
                      const rowStyle = {
                        background: n.read ? "transparent" : "color-mix(in srgb, var(--accent-cyan-strong) 8%, transparent)",
                      }
                      const inner = (
                        <>
                            <div
                              className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                              style={{
                                background: "var(--panel2)",
                                border: "1px solid var(--border)",
                                color: "var(--muted2)",
                              }}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-medium" style={{ color: "var(--text)" }}>
                                {n.title}
                              </p>
                              {n.body && (
                                <p className="mt-0.5 line-clamp-2 text-[10px]" style={{ color: "var(--muted2)" }}>
                                  {n.body}
                                </p>
                              )}
                              <p className="mt-1 text-[10px]" style={{ color: "var(--muted)" }}>
                                {formatTime(n.createdAt)}
                              </p>
                              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                {!n.read && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      markAsRead(n.id)
                                    }}
                                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium"
                                    style={{ color: "var(--accent-cyan-strong)" }}
                                  >
                                    <Check className="h-3 w-3" />
                                    Mark read
                                  </button>
                                )}
                                {dest && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium" style={{ color: "var(--accent-cyan-strong)" }}>
                                    {dest.label === "Open chat" && <MessageSquare className="h-3 w-3" />}
                                    {dest.label}
                                  </span>
                                )}
                              </div>
                            </div>
                        </>
                      )
                      return (
                        <li key={n.id}>
                          {dest ? (
                            <Link href={dest.href} onClick={onClose} className={rowClassName} style={rowStyle}>
                              {inner}
                            </Link>
                          ) : (
                            <div className={rowClassName} style={rowStyle}>
                              {inner}
                            </div>
                          )}
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

      <footer className="border-t px-3 py-2" style={{ borderColor: "var(--border)" }}>
        <Link
          href="/app/notifications"
          onClick={onClose}
          className="block text-center text-[11px] font-medium"
          style={{ color: "var(--accent-cyan-strong)" }}
        >
          See all notifications
        </Link>
      </footer>
    </div>
  )
}

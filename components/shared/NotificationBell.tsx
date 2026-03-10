"use client"

import { Bell } from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"

export default function NotificationBell() {
  const { notifications } = useNotifications(20)
  const unread = notifications.filter((n) => !n.read).length

  return (
    <button
      type="button"
      className="relative rounded-lg border p-2 transition"
      style={{
        borderColor: "var(--border)",
        background: "color-mix(in srgb, var(--panel2) 82%, transparent)",
        color: "var(--text)",
      }}
      title="Notifications"
      aria-label="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unread > 0 && (
        <span
          className="absolute -right-1 -top-1 inline-flex min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
          style={{ background: "var(--accent-cyan-strong)", color: "var(--on-accent-bg)" }}
        >
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </button>
  )
}

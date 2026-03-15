"use client"

import { useRef, useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"
import NotificationPanel from "@/components/notifications/NotificationPanel"
import { getUnreadBadgeCount } from "@/lib/notification-center"
import { isNotificationDrawerCloseKey } from "@/lib/notification-center"

export default function NotificationBell() {
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const { notifications } = useNotifications(20)
  const unreadBadge = getUnreadBadgeCount(notifications, 9)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      )
        return
      setOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (isNotificationDrawerCloseKey(e.key)) {
        e.preventDefault()
        setOpen(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open])

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-lg border p-2 transition"
        style={{
          borderColor: "var(--border)",
          background: open
            ? "color-mix(in srgb, var(--panel2) 95%, transparent)"
            : "color-mix(in srgb, var(--panel2) 82%, transparent)",
          color: "var(--text)",
        }}
        title="Notifications"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-4 w-4" />
        {unreadBadge !== 0 && (
          <span
            className="absolute -right-1 -top-1 inline-flex min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
            style={{
              background: "var(--accent-cyan-strong)",
              color: "var(--on-accent-bg)",
            }}
          >
            {String(unreadBadge)}
          </span>
        )}
      </button>
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full z-50 mt-1.5"
        >
          <NotificationPanel onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

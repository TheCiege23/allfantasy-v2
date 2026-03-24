"use client"

import { useRef, useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import { Bell } from "lucide-react"
import { useNotifications } from "@/hooks/useNotifications"
import { NotificationPanelView } from "@/components/notifications/NotificationPanel"
import { getUnreadBadgeCount } from "@/lib/notification-center"
import { isNotificationDrawerCloseKey } from "@/lib/notification-center"

export default function NotificationBell() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const lastPathRef = useRef(pathname)
  const notificationsState = useNotifications(40, { usePlaceholders: false })
  const { notifications } = notificationsState
  const unreadBadge = getUnreadBadgeCount(notifications, 9)
  const panelId = "notification-center-drawer"

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

  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      setOpen(false)
      lastPathRef.current = pathname
    }
  }, [pathname])

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
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
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
          id={panelId}
          role="dialog"
          aria-label="Notification center"
        >
          <NotificationPanelView state={notificationsState} onClose={() => setOpen(false)} />
        </div>
      )}
    </div>
  )
}

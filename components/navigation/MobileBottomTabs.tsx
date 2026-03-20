"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, MessageCircle, Trophy, User, Volleyball } from "lucide-react"

type BottomTab = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const MOBILE_BOTTOM_TABS: BottomTab[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/sports/fantasy-football", label: "Sports", icon: Volleyball },
  { href: "/brackets", label: "Bracket", icon: Trophy },
  { href: "/messages", label: "Messages", icon: MessageCircle },
  { href: "/profile", label: "Profile", icon: User },
]

export default function MobileBottomTabs() {
  const pathname = usePathname()

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-700/80 bg-[#0d0f29]/95 px-2 py-2 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
        {MOBILE_BOTTOM_TABS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "group relative flex flex-col items-center justify-center rounded-xl px-1 py-2 text-[10px] font-semibold transition duration-150 active:scale-95",
                active ? "bg-cyan-500/20 text-cyan-200" : "text-slate-300 hover:bg-slate-800/70",
              ].join(" ")}
            >
              <span
                className={[
                  "absolute left-1/2 top-1 h-0.5 w-6 -translate-x-1/2 rounded-full transition-opacity",
                  active ? "bg-cyan-300 opacity-100" : "opacity-0",
                ].join(" ")}
                aria-hidden="true"
              />
              <Icon className="mb-1 h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

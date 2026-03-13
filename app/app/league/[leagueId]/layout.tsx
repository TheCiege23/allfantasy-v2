import type { ReactNode } from "react"
import LeagueChatDockClient from "@/components/chat/LeagueChatDockClient"

export default function LeagueLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <LeagueChatDockClient />
    </>
  )
}

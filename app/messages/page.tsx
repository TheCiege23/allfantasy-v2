"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { useSession } from "next-auth/react"
import AppShellNav from "@/components/navigation/AppShellNav"

const TABS = [
  { id: "dm", label: "Private DMs" },
  { id: "groups", label: "Group Chats" },
  { id: "ai", label: "AI Chatbot" },
] as const

type TabId = (typeof TABS)[number]["id"]

export default function MessagesPage() {
  const { data: session, status } = useSession()
  const [activeTab, setActiveTab] = useState<TabId>("dm")

  const isAuthenticated = status === "authenticated"
  const userLabel = useMemo(() => {
    if (!isAuthenticated) return "Guest"
    return session?.user?.name || session?.user?.email || "User"
  }, [isAuthenticated, session?.user?.email, session?.user?.name])

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <AppShellNav isAuthenticated={isAuthenticated} userLabel={userLabel} />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 space-y-5">
        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h1 className="text-2xl font-semibold">Messages</h1>
          <p className="mt-1 text-sm text-white/60">
            Unified inbox for DMs, group chats, and AI chat.
          </p>
        </section>

        {!isAuthenticated ? (
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <h2 className="text-xl font-semibold">Sign in to open your inbox</h2>
            <p className="mt-2 text-sm text-white/60">
              Account login is required for private and league chat history.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link href="/login?next=/messages" className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10">
                Sign In
              </Link>
              <Link href="/signup?next=/messages" className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-slate-200">
                Sign Up
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
              <div className="flex gap-2 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-lg px-4 py-2 text-sm transition ${
                      activeTab === tab.id ? "bg-white text-black" : "bg-white/5 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
              {activeTab === "dm" && (
                <div>
                  <h3 className="text-lg font-semibold">Private DMs</h3>
                  <p className="mt-1 text-sm text-white/60">Search users, open one-on-one chats, and manage mentions.</p>
                </div>
              )}
              {activeTab === "groups" && (
                <div>
                  <h3 className="text-lg font-semibold">Group Chats</h3>
                  <p className="mt-1 text-sm text-white/60">League channels, commissioner broadcasts, polls, and media sharing.</p>
                </div>
              )}
              {activeTab === "ai" && (
                <div>
                  <h3 className="text-lg font-semibold">AI Chatbot</h3>
                  <p className="mt-1 text-sm text-white/60">Ask one question at a time for trade, waiver, draft, and strategy coaching.</p>
                  <Link href="/legacy?tab=chat" className="mt-4 inline-flex rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-200 hover:bg-cyan-500/20">
                    Open Legacy AI Chat
                  </Link>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}

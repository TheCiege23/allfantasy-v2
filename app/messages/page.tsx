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
    <div className="min-h-screen mode-surface mode-readable">
      <AppShellNav isAuthenticated={isAuthenticated} userLabel={userLabel} />

      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 space-y-5">
        <section className="mode-panel rounded-2xl p-5">
          <h1 className="text-2xl font-semibold mode-text">Messages</h1>
          <p className="mt-1 text-sm mode-muted">
            Unified inbox for DMs, group chats, and AI chat.
          </p>
        </section>

        {!isAuthenticated ? (
          <section className="mode-panel rounded-2xl p-8 text-center">
            <h2 className="text-xl font-semibold mode-text">Sign in to open your inbox</h2>
            <p className="mt-2 text-sm mode-muted">
              Account login is required for private and league chat history.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Link href="/login?next=/messages" className="rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>
                Sign In
              </Link>
              <Link href="/signup?next=/messages" className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: 'var(--accent-cyan-strong)', color: 'var(--on-accent-bg)' }}>
                Sign Up
              </Link>
            </div>
          </section>
        ) : (
          <>
            <section className="mode-panel rounded-2xl p-3">
              <div className="flex gap-2 overflow-x-auto">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="rounded-lg px-4 py-2 text-sm transition"
                    style={activeTab === tab.id ? { background: 'var(--text)', color: 'var(--bg)' } : { background: 'color-mix(in srgb, var(--panel2) 80%, transparent)', color: 'var(--muted)' }}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="mode-panel rounded-2xl p-6">
              {activeTab === "dm" && (
                <div>
                  <h3 className="text-lg font-semibold mode-text">Private DMs</h3>
                  <p className="mt-1 text-sm mode-muted">Search users, open one-on-one chats, and manage mentions.</p>
                </div>
              )}
              {activeTab === "groups" && (
                <div>
                  <h3 className="text-lg font-semibold mode-text">Group Chats</h3>
                  <p className="mt-1 text-sm mode-muted">League channels, commissioner broadcasts, polls, and media sharing.</p>
                </div>
              )}
              {activeTab === "ai" && (
                <div>
                  <h3 className="text-lg font-semibold mode-text">AI Chatbot</h3>
                  <p className="mt-1 text-sm mode-muted">Ask one question at a time for trade, waiver, draft, and strategy coaching.</p>
                  <Link href="/legacy?tab=chat" className="mt-4 inline-flex rounded-lg border px-4 py-2 text-sm" style={{ borderColor: 'color-mix(in srgb, var(--accent-cyan) 45%, var(--border))', color: 'var(--accent-cyan-strong)', background: 'color-mix(in srgb, var(--accent-cyan) 14%, transparent)' }}>
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

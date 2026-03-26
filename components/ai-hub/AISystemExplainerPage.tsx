'use client'

import Link from 'next/link'
import HomeTopNav from '@/components/navigation/HomeTopNav'
import { Bot, Cpu, Zap, ArrowRight, Sparkles } from 'lucide-react'

export default function AISystemExplainerPage() {
  return (
    <main
      className="min-h-screen flex flex-col mode-readable"
      style={{ background: 'var(--bg)', color: 'var(--text)' }}
    >
      <HomeTopNav />

      <article className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How the AllFantasy AI system works
          </h1>
          <p className="mt-4 text-base leading-relaxed" style={{ color: 'var(--muted)' }}>
            AllFantasy combines deterministic engines with multiple AI providers so you get reliable numbers first, then clear explanations and advice.
          </p>

          <section className="mt-10">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Bot className="h-5 w-5 text-purple-400" aria-hidden />
              Chimmy overview
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              Chimmy is your AI fantasy assistant. You can ask Chimmy about trades, waivers, drafts, matchups, and league strategy. Chimmy uses the same unified AI layer as the rest of the app: your question is turned into a structured context (envelope) that includes league data, sport, and any deterministic results we already have. Chimmy then gets an answer from our AI providers and returns a clear, on-topic response. Chimmy does not invent stats or override our engines—it explains and advises within the facts we give it.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Cpu className="h-5 w-5 text-cyan-400" aria-hidden />
              Deterministic-first AI
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              Before any AI runs, AllFantasy runs deterministic engines where they apply: trade fairness and lineup impact, rankings and tiers, waiver priority, simulation outcomes, legacy score, reputation, and draft value. Those results are passed into the AI as context. The AI is instructed not to override or contradict them. So you get consistent numbers (scores, orderings, probabilities) from our rules, and the AI adds explanation, narrative, and recommendations that stay aligned with those numbers. This keeps outputs trustworthy and repeatable.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-400" aria-hidden />
              OpenAI, DeepSeek, and xAI (Grok)
            </h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
              AllFantasy can use multiple AI providers: OpenAI (e.g. GPT-4), DeepSeek, and xAI (Grok), plus OpenClaw assistant routing for workflow-focused assistant surfaces. Each is wired through a single orchestration layer. The app chooses which provider to call based on availability, your request, and optional routing hints. If one provider is unavailable or rate-limited, the system can fall back to another. You don’t have to pick a provider yourself—the system handles it. All providers receive the same deterministic context and rules so behavior stays consistent no matter which model answers.
            </p>
          </section>

          <section className="mt-10 rounded-2xl border p-6" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
            <h2 className="text-lg font-semibold mb-2">Try AI tools</h2>
            <p className="text-sm mb-4" style={{ color: 'var(--muted)' }}>
              Trade analyzer, waiver AI, draft helper, matchup sim, fantasy coach, and more—all use this system.
            </p>
            <Link
              href="/ai/tools"
              data-testid="ai-system-try-tools-button"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black shadow-lg hover:bg-emerald-400 transition-colors"
            >
              <Sparkles className="h-5 w-5 shrink-0" />
              Try AI Tools
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </section>
        </div>
      </article>

      <footer className="border-t py-6 text-center text-xs" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
        <div className="mx-auto flex flex-wrap items-center justify-center gap-3 px-4">
          <Link href="/" className="hover:underline">Home</Link>
          <span style={{ color: 'var(--muted2)' }}>·</span>
          <Link href="/app" className="hover:underline">App</Link>
          <span style={{ color: 'var(--muted2)' }}>·</span>
          <Link href="/chimmy" className="hover:underline">Chimmy</Link>
        </div>
      </footer>
    </main>
  )
}

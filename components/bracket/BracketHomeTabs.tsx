import Link from 'next/link'
import { Plus, Users, Trophy, MessageCircle, Sparkles, History } from 'lucide-react'

export default function BracketHomeTabs({ poolCount }: { poolCount: number }) {
  const cards = [
    { href: '/brackets/leagues/new', label: 'Create Pool', desc: 'Set scoring, entry limit, privacy, and invite link.', icon: Plus },
    { href: '/brackets/join', label: 'Join Pool', desc: 'Enter invite code and start competing quickly.', icon: Users },
    { href: '/brackets', label: 'My Pools', desc: `${poolCount} active pool${poolCount === 1 ? '' : 's'} in your account.`, icon: Trophy },
    { href: '/messages', label: 'Pool Chat', desc: 'Jump into chat, polls, and AI discussion.', icon: MessageCircle },
    { href: '/af-legacy?tab=chat', label: 'AI Coach', desc: 'Get safe vs contrarian guidance instantly.', icon: Sparkles },
    { href: '/brackets', label: 'History', desc: 'Review prior entries and finishing trends.', icon: History },
  ]

  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const Icon = card.icon
        return (
          <Link
            key={`${card.label}-${card.href}`}
            href={card.href}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4 hover:bg-white/[0.06] transition"
          >
            <div className="mb-2 inline-flex rounded-lg border border-white/15 bg-black/30 p-2">
              <Icon className="h-4 w-4 text-cyan-300" />
            </div>
            <h3 className="text-sm font-semibold text-white">{card.label}</h3>
            <p className="mt-1 text-xs text-white/55">{card.desc}</p>
          </Link>
        )
      })}
    </section>
  )
}

import CreatorsDiscoveryClient from './CreatorsDiscoveryClient'
import CreatorsLeaderboardClient from './CreatorsLeaderboardClient'

export const dynamic = 'force-dynamic'

export default function CreatorsPage() {
  return (
    <div className="min-h-screen mode-surface mode-readable">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <section
          className="rounded-[32px] border px-6 py-8"
          style={{
            borderColor: 'var(--border)',
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 14%, var(--panel)) 0%, color-mix(in srgb, var(--panel2) 22%, var(--panel)) 100%)',
          }}
        >
          <p className="text-xs uppercase tracking-[0.24em]" style={{ color: 'var(--muted)' }}>
            AllFantasy creators
          </p>
          <h1 className="mt-3 text-3xl font-bold" style={{ color: 'var(--text)' }}>
            Discover branded creator leagues and community rooms
          </h1>
          <p className="mt-3 max-w-3xl text-sm" style={{ color: 'var(--muted)' }}>
            Find creators, podcasters, analysts, influencers, and community leaders running fantasy leagues and bracket competitions across every supported sport.
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Discover creators
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            Follow creators, jump into featured public leagues, and copy share links directly from the discovery feed.
          </p>
          <div className="mt-5">
            <CreatorsDiscoveryClient />
          </div>
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text)' }}>
            Featured creator rankings
          </h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
            Ranked by public league traction and community participation.
          </p>
          <div className="mt-5">
            <CreatorsLeaderboardClient />
          </div>
        </section>
      </div>
    </div>
  )
}

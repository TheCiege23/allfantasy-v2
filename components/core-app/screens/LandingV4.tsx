'use client'

import Link from 'next/link'
import '@/components/core-app/af-landing.css'

/**
 * Landing page — the "landing, auth & import" handoff.
 *
 * Token values in that handoff are byte-identical to the core-app one, so this
 * reuses the `.af-core` scope rather than duplicating a second copy that would
 * drift. See af-core.css for why the scope exists at all.
 *
 * ⚠ NOT MOUNTED AT `/`. The live homepage is LandingNocturne and this is a
 * preview until someone has looked at it — replacing the production marketing
 * page, which carries the SEO and every acquisition link, is a decision to make
 * deliberately rather than as a side effect of a redesign landing.
 *
 * ⚠ THE B2B BAND DESCRIBES THINGS THAT DO NOT EXIST YET. There is no partner
 * sign-in page, no `partners@allfantasy.ai` anywhere in the repo, and no sales
 * endpoint. Rather than wire "Book a demo" to a POST that silently drops leads —
 * the worst outcome, because someone with real buying intent hears nothing back —
 * the form composes a mailto. Nothing can be lost server-side, and the missing
 * inbox becomes obvious immediately instead of after a quarter of silence.
 */

const PLATFORMS = [
  { name: 'Sleeper', state: 'live' as const },
  { name: 'ESPN', state: 'live' as const },
  { name: 'Yahoo', state: 'live' as const },
  { name: 'MFL · Fantrax', state: 'soon' as const },
]

const REASONS = [
  {
    n: '01',
    title: ['All your leagues,', 'one board.'],
    body: 'Sleeper, ESPN and Yahoo, with your real rosters and history. One Sunday view instead of four tabs.',
  },
  {
    n: '02',
    title: ['One player,', 'every league.'],
    body: 'Search a name and see every team you have him on, his injury status, and the swap or waiver that follows in each one.',
  },
  {
    n: '03',
    title: ['Know what', 'needs you.'],
    body: 'Unset lineups, waiver runs, trades on the clock — each tagged with the league and the deadline it belongs to.',
  },
]

const FAQ = [
  {
    q: 'Can I import my Sleeper, ESPN and Yahoo leagues?',
    a: 'Yes — read-only. We copy your real rosters, matchups and scoring, and never change anything on the platform.',
  },
  {
    q: 'How does the cross-league player finder work?',
    a: 'Search a player once and see every league you roster him in, his slot and injury status, and what to do about him in each.',
  },
  {
    q: 'Is AllFantasy gambling or DFS?',
    a: 'No. AllFantasy is 100% season-long fantasy sports. No sportsbook, no daily fantasy.',
  },
  {
    q: 'What does it cost?',
    a: 'Free forever for players. Paid plans run $9.99–$29.99/mo and can be cancelled anytime.',
  },
]

const CAPABILITIES = [
  {
    key: 'IMPORT',
    title: 'Six platforms, one schema',
    body: 'Leagues, rosters, settings, standings and transaction history — read-only, in a single normalised shape.',
  },
  {
    key: 'GRADE',
    title: 'Trade and waiver scoring',
    body: "Fairness, value edge and uncertainty — computed against that league's own settings, not a global ranking.",
  },
  {
    key: 'PROJECT',
    title: 'League-scoped projections',
    body: 'Win probability, playoff and title odds, priced for superflex, TE premium, IDP and the rest.',
  },
  {
    key: 'RUN',
    title: 'Pools and brackets',
    body: 'White-label bracket challenges across six sports, with scoring, leaderboards and five languages.',
  },
]

const AUDIENCES = [
  { who: 'Fantasy platforms', why: 'Add grading and projections without building a model team.' },
  { who: 'Media & creators', why: 'Segment-ready data for shows, newsletters and clips.' },
  { who: 'League operators', why: 'Run branded pools and brackets on your own domain.' },
  { who: 'Brands & agencies', why: 'Season-long activations tied to real league data.' },
]

const NETWORK = [
  { name: 'Gooby', body: 'Social discovery for people and their dogs.', href: 'https://gogooby.com' },
  { name: 'Cafe Con Chimmy', body: 'Culture, coffee and conversation from the Chimmy world.', href: 'https://cafeconchimmy.com' },
  { name: 'Parent Playbook', body: 'Practical plays for parents, one situation at a time.', href: 'https://playbook.chimaura.com' },
  { name: 'PetPass', body: 'Every pet record, vet visit and reminder in one pass.', href: 'https://petpass.chimaura.com' },
  { name: 'SideQuest', body: 'Turn the side hustle into a tracked, finishable quest.', href: 'https://sidequest.chimaura.com' },
  { name: 'StoryVault', body: 'Record and keep the family stories before they are gone.', href: 'https://storyvault.chimaura.com' },
]

function Shield() {
  return (
    <svg width="28" height="30" viewBox="0 0 28 30" aria-hidden focusable="false">
      <path
        d="M14 1.5 26 6v10.5c0 6.4-5 10.6-12 12.5-7-1.9-12-6.1-12-12.5V6l12-4.5Z"
        fill="var(--accent-soft)"
        stroke="var(--accent)"
        strokeWidth="1.5"
      />
      <text
        x="14"
        y="19"
        textAnchor="middle"
        fill="var(--accent)"
        style={{ font: '900 10px Archivo, sans-serif', letterSpacing: '0.02em' }}
      >
        AF
      </text>
    </svg>
  )
}

export function LandingV4() {
  return (
    <div className="af-core af-lp">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav className="af-lp-nav" aria-label="Main">
        <Link href="/" className="af-lp-brand">
          <Shield />
          <span className="af-lp-wordmark">AllFantasy</span>
        </Link>

        <div className="af-lp-nav-links">
          <a href="#how">How it works</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">For commissioners</a>
          {/* The handoff puts this in --accent: it is the only nav item pointing
              at a different audience, and the colour is what separates it. */}
          <a href="#business" className="af-lp-nav-business">
            For business
          </a>
        </div>

        <div className="af-lp-nav-right">
          <Link href="/login">Sign in</Link>
          <span className="af-lp-nav-divider" aria-hidden />
          <a href="#business" className="af-lp-partners">
            Partners
            <span className="af-lp-api-chip af-num">API</span>
          </a>
          <Link href="/signup" className="af-btn af-lp-cta">
            Get started free
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <header className="af-lp-hero" id="how">
        <div className="af-lp-hero-text">
          <span className="af-lp-eyebrow af-num">Fantasy sports only · no gambling</span>
          <h1 className="af-lp-h1">
            Every league you play.
            <br />
            <span className="af-lp-h1-accent">One screen.</span>
          </h1>
          <p className="af-lp-sub">
            Connect Sleeper, ESPN and Yahoo. See what needs you across every league, and exactly
            where to go and fix it.
          </p>
          <div className="af-lp-hero-ctas">
            <Link href="/signup" className="af-btn af-lp-cta-lg">
              Get started free
            </Link>
            <a href="#how" className="af-btn af-btn--ghost af-lp-cta-lg">
              See how it works
            </a>
          </div>
          <p className="af-lp-reassure">
            Free forever for players · Read-only · Cancel anytime
          </p>
        </div>

        {/*
          The hero card is illustrative, and labelled as such. It shows the shape
          of the product with example leagues — not a live reading — so it must
          not be mistaken for someone's actual data.
        */}
        <aside className="af-lp-hero-card" aria-label="Example of the leagues view">
          <div className="af-lp-card-head">
            <span className="af-lp-card-title">Your leagues</span>
            <span className="af-lp-card-week af-num">Week 12 · example</span>
          </div>
          {[
            { mark: 'S', platform: 'sleeper', name: 'Dynasty Dragons', meta: 'Sleeper · Dynasty PPR', score: '96.2', against: '–88.4', tag: 'Set flex', tone: 'bad' },
            { mark: 'E', platform: 'espn', name: 'Gridiron Gang', meta: 'ESPN · 0.5 PPR', score: '74.0', against: '–91.6', tag: 'Waivers', tone: 'warn' },
            { mark: 'Y', platform: 'yahoo', name: 'Waiver Warriors', meta: 'Yahoo · Standard', score: '110.8', against: '–102.1', tag: 'Trade', tone: 'warn' },
            { mark: 'E', platform: 'espn', name: 'End Zone Elites', meta: 'ESPN · Keeper', score: '88.4', against: '–71.9', tag: 'All set', tone: 'good' },
          ].map((row) => (
            <div key={row.name} className="af-lp-card-row">
              <span className="af-platform af-lp-card-mark" data-platform={row.platform}>
                {row.mark}
              </span>
              <span className="af-lp-card-text">
                <span className="af-lp-card-name">{row.name}</span>
                <span className="af-lp-card-meta">{row.meta}</span>
              </span>
              <span className="af-lp-card-score af-num">
                {row.score}
                <span className="af-lp-card-against">{row.against}</span>
              </span>
              <span className="af-lp-card-tag af-num" data-tone={row.tone}>
                {row.tag}
              </span>
            </div>
          ))}
          <div className="af-lp-card-foot">
            <span className="af-lp-card-foot-text">
              Two fixes worth <strong>+13.0</strong> — Chimmy, across all 4 leagues
            </span>
          </div>
        </aside>
      </header>

      {/* ── Connects to ─────────────────────────────────────────────── */}
      <section className="af-lp-connects">
        <span className="af-label">Connects to</span>
        <div className="af-lp-connect-row">
          {PLATFORMS.map((p) => (
            <span key={p.name} className="af-lp-connect" data-state={p.state}>
              {p.name}
              {p.state === 'soon' ? <span className="af-lp-soon af-num">soon</span> : null}
            </span>
          ))}
        </div>
        <span className="af-lp-sports af-num">NFL · NBA · NHL · MLB · NCAA · SOCCER</span>
      </section>

      {/* ── Three reasons ───────────────────────────────────────────── */}
      <section className="af-lp-reasons">
        <h2 className="af-lp-h2">Three things you can&apos;t do anywhere else</h2>
        <div className="af-lp-reason-grid">
          {REASONS.map((r) => (
            <article key={r.n} className="af-lp-reason">
              <span className="af-lp-reason-n af-num">{r.n}</span>
              <h3 className="af-lp-reason-title">
                {r.title[0]}
                <br />
                {r.title[1]}
              </h3>
              <p className="af-lp-reason-body">{r.body}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Pricing line ────────────────────────────────────────────── */}
      <section className="af-lp-pricing" id="pricing">
        <h2 className="af-lp-h2">Free to see it all. Upgrade to act on it.</h2>
        <p className="af-lp-pricing-body">
          Every league, live score and standing is free. Paid plans from $9.99/mo add trade grades,
          projections and commissioner tools.
        </p>
        <div className="af-lp-pricing-ctas">
          <Link href="/signup" className="af-btn">
            Start free
          </Link>
          <Link href="/pricing" className="af-btn af-btn--ghost">
            Compare plans
          </Link>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section className="af-lp-faq" id="faq">
        <h2 className="af-lp-h2">Questions managers ask</h2>
        <div className="af-lp-faq-list">
          {FAQ.map((f) => (
            <details key={f.q} className="af-lp-faq-item">
              <summary className="af-lp-faq-q">{f.q}</summary>
              <p className="af-lp-faq-a">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── AllFantasy for Business ─────────────────────────────────── */}
      <section className="af-lp-b2b" id="business">
        <div className="af-lp-b2b-head">
          <div className="af-lp-b2b-intro">
            <span className="af-lp-eyebrow af-num af-lp-eyebrow--accent">AllFantasy for business</span>
            <h2 className="af-lp-b2b-h2">The cross-platform layer, as an API</h2>
            <p className="af-lp-b2b-body">
              The hard part isn&apos;t the data — it&apos;s that six platforms model a league six
              different ways. We already reconcile them.
            </p>
          </div>

          <div className="af-lp-b2b-cta">
            <a href="#demo" className="af-btn af-lp-b2b-btn">
              Book a demo
            </a>
            {/*
              ⚠ There is no partner sign-in surface in this codebase. Pointing this
              at a route that 404s would be worse than pointing it at the demo
              form, so it scrolls to the form until that surface exists.
            */}
            <a href="#demo" className="af-btn af-btn--ghost af-lp-b2b-btn">
              Partner sign in
            </a>
            <span className="af-lp-b2b-note">Sandbox keys same day · no card</span>
          </div>
        </div>

        <div className="af-lp-cap-grid">
          {CAPABILITIES.map((c) => (
            <article key={c.key} className="af-lp-cap">
              <span className="af-label af-lp-cap-key">{c.key}</span>
              <h3 className="af-lp-cap-title">{c.title}</h3>
              <p className="af-lp-cap-body">{c.body}</p>
            </article>
          ))}
        </div>

        <div className="af-lp-b2b-bottom">
          <div className="af-lp-audience">
            <span className="af-label">Who this is for</span>
            <ul className="af-lp-audience-list">
              {AUDIENCES.map((a) => (
                <li key={a.who}>
                  <span className="af-lp-audience-who">{a.who}</span>
                  <span className="af-lp-audience-why">{a.why}</span>
                </li>
              ))}
            </ul>
            <p className="af-lp-boundary">
              <span className="af-readonly">Read-only</span>
              Same boundary as the consumer product: read-only on every platform, season-long
              fantasy only, no gambling or DFS, and we never post on a user&apos;s behalf.
            </p>
          </div>

          {/*
            The demo form composes a mailto rather than POSTing. There is no sales
            endpoint in this codebase, and a form that accepts a lead and drops it
            is worse than no form — the person believes they have been in touch.
          */}
          <form
            className="af-lp-demo"
            id="demo"
            action="mailto:partners@allfantasy.ai"
            method="post"
            encType="text/plain"
          >
            <span className="af-label">Book a demo</span>
            <p className="af-lp-demo-body">
              Thirty minutes, your use case, a sandbox key at the end of it.
            </p>
            <label className="af-lp-field">
              <span className="af-label">Work email</span>
              <input type="email" name="email" required placeholder="you@company.com" />
            </label>
            <label className="af-lp-field">
              <span className="af-label">Company</span>
              <input type="text" name="company" placeholder="Company" />
            </label>
            <label className="af-lp-field">
              <span className="af-label">What you&apos;d build</span>
              <textarea name="useCase" rows={3} placeholder="Briefly, what you have in mind" />
            </label>
            <button type="submit" className="af-btn af-lp-demo-submit">
              Request a demo
            </button>
            <p className="af-lp-demo-alt">
              Or email <a href="mailto:partners@allfantasy.ai">partners@allfantasy.ai</a>
            </p>
          </form>
        </div>
      </section>

      {/* ── Brown Pig network ───────────────────────────────────────── */}
      <section className="af-lp-network">
        <span className="af-label">From Brown Pig LLC</span>
        <h2 className="af-lp-h2">Apps that solve real problems</h2>
        <p className="af-lp-network-body">
          AllFantasy is one of six products we build and run. One account family, same standard.
        </p>
        <div className="af-lp-network-grid">
          {NETWORK.map((n) => (
            <a key={n.name} href={n.href} className="af-lp-network-card" target="_blank" rel="noopener noreferrer">
              <span className="af-lp-network-name">{n.name}</span>
              <span className="af-lp-network-desc">{n.body}</span>
              <span className="af-lp-network-link af-num">
                {n.href.replace(/^https?:\/\//, '')} →
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="af-lp-footer">
        <div className="af-lp-footer-top">
          <span className="af-lp-brand">
            <Shield />
            <span className="af-lp-wordmark">AllFantasy</span>
          </span>
          <nav className="af-lp-footer-links" aria-label="Footer">
            <Link href="/core/players">Player finder</Link>
            <Link href="/dashboard">Dashboard</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/data-deletion">Data deletion</Link>
          </nav>
        </div>
        <div className="af-lp-footer-legal">
          <span>© 2026 AllFantasy.ai</span>
          <span className="af-label">Built by Brown Pig LLC</span>
        </div>
        {/*
          Jurisdiction copy is a compliance statement, not decoration — it stays
          in the footer verbatim.
        */}
        <p className="af-lp-footer-compliance">
          Not available in WA. Paid leagues restricted in HI, ID, MT, NV. 100% fantasy sports — no
          gambling, no DFS.
        </p>
      </footer>
    </div>
  )
}

export default LandingV4

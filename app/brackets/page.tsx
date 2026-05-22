import Link from "next/link"

export const dynamic = "force-dynamic"

/**
 * MINIMAL HARDENED /brackets PAGE — restored by emergency Phase 6 hardening.
 *
 * The full page (with Prisma queries, next-auth session, World Cup hero,
 * pool cards, leaderboard, etc.) is preserved in `_page-full.tsx.bak`
 * and will be restored once root cause of the Railway HTTP 500 is
 * identified. Do NOT add Prisma calls, next-auth, third-party scripts,
 * or heavy client widgets to this file until production is stable.
 *
 * Goals of this version:
 *   1. Zero database access at render time.
 *   2. Zero auth lookups at render time.
 *   3. Zero dynamic SEO / metadata resolution.
 *   4. Zero client-only providers (next-auth, theme, realtime).
 *   5. Pure server component returning static JSX.
 */
export default function BracketsHomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0b1020",
        color: "#e6e8ef",
        padding: "32px 16px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "880px", margin: "0 auto" }}>
        <header style={{ marginBottom: "24px" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "#7d88a8",
              marginBottom: "8px",
            }}
          >
            AllFantasy
          </div>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: 800,
              margin: "0 0 8px 0",
              lineHeight: 1.2,
            }}
          >
            Bracket Pools
          </h1>
          <p
            style={{
              fontSize: "14px",
              lineHeight: 1.55,
              color: "#aab2c8",
              margin: 0,
            }}
          >
            Create or join a bracket pool — FIFA World Cup, NBA & NHL
            playoffs, and more. Free to play. AI analysis. Live leaderboards.
          </p>
        </header>

        <section
          style={{
            background: "#141a2e",
            border: "1px solid #232b46",
            borderRadius: "16px",
            padding: "24px",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 700,
              margin: "0 0 12px 0",
            }}
          >
            Get started
          </h2>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link
              href="/brackets/leagues/new"
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                background: "#5eead4",
                color: "#0b1020",
                fontWeight: 700,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              Create a pool
            </Link>
            <Link
              href="/brackets/join"
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "1px solid #2d3658",
                background: "transparent",
                color: "#e6e8ef",
                fontWeight: 600,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              Join with code
            </Link>
            <Link
              href="/dashboard"
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                border: "1px solid #2d3658",
                background: "transparent",
                color: "#e6e8ef",
                fontWeight: 600,
                fontSize: "13px",
                textDecoration: "none",
              }}
            >
              Dashboard
            </Link>
          </div>
        </section>

        <section
          style={{
            background: "#141a2e",
            border: "1px solid #232b46",
            borderRadius: "16px",
            padding: "24px",
          }}
        >
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 700,
              margin: "0 0 12px 0",
              color: "#aab2c8",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Sports
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "10px",
            }}
          >
            {[
              { label: "World Cup", href: "/brackets" },
              { label: "NBA Playoffs", href: "/brackets" },
              { label: "NHL Playoffs", href: "/brackets" },
              { label: "NFL Playoffs", href: "/brackets" },
              { label: "MLB Postseason", href: "/brackets" },
              { label: "College Football", href: "/brackets" },
              { label: "March Madness", href: "/brackets" },
              { label: "Soccer", href: "/brackets" },
            ].map(({ label, href }) => (
              <Link
                key={label}
                href={href}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "1px solid #2d3658",
                  background: "#0f1428",
                  color: "#e6e8ef",
                  fontWeight: 600,
                  fontSize: "12px",
                  textAlign: "center",
                  textDecoration: "none",
                }}
              >
                {label}
              </Link>
            ))}
          </div>
        </section>

        <div
          style={{
            marginTop: "20px",
            fontSize: "11px",
            color: "#6b7693",
            textAlign: "center",
          }}
        >
          AllFantasy · Free forever · Not gambling · No prizes
        </div>
      </div>
    </main>
  )
}

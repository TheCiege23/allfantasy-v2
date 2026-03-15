import Link from 'next/link'

export default function WalletPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 mode-readable">
      <section className="mode-panel rounded-2xl p-6">
        <h1 className="text-2xl font-semibold mode-text">Wallet</h1>
        <p className="mt-2 text-sm mode-muted">Shared wallet/payment identity across Bracket, WebApp, and Legacy.</p>
        <div className="mt-4 flex gap-2">
          <Link href="/wallet/deposit" className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: 'var(--border)' }}>Deposit</Link>
        </div>
      </section>
    </main>
  )
}

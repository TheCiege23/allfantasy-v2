'use client'

import Link from 'next/link'

type Row = {
  id: string
  name: string
  description: string
  href: string
  external?: boolean
  testId: string
}

const ROWS: Row[] = [
  {
    id: 'sleeper',
    name: 'Sleeper',
    description: 'Import leagues, history, and rankings (broadest automated sync).',
    href: '/import',
    testId: 'onboarding-connect-sleeper',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Connect Discord for chat features and profile sync.',
    href: '/api/auth/discord',
    external: true,
    testId: 'onboarding-connect-discord',
  },
  {
    id: 'yahoo',
    name: 'Yahoo Fantasy',
    description: 'League import & preview (Fetch & Preview + League Sync).',
    href: '/import',
    testId: 'onboarding-connect-yahoo',
  },
  {
    id: 'espn',
    name: 'ESPN',
    description: 'Import teams and scores; private leagues may need League Sync.',
    href: '/import',
    testId: 'onboarding-connect-espn',
  },
  {
    id: 'fantrax',
    name: 'Fantrax',
    description: 'League import via preview flow.',
    href: '/import',
    testId: 'onboarding-connect-fantrax',
  },
  {
    id: 'mfl',
    name: 'MyFantasyLeague (MFL)',
    description: 'League import via preview flow.',
    href: '/import',
    testId: 'onboarding-connect-mfl',
  },
  {
    id: 'fleaflicker',
    name: 'Fleaflicker',
    description: 'League import via preview flow.',
    href: '/import',
    testId: 'onboarding-connect-fleaflicker',
  },
  {
    id: 'sleeper-account',
    name: 'Sleeper account link',
    description: 'Link your Sleeper username in settings for identity & imports.',
    href: '/settings/connect/sleeper',
    testId: 'onboarding-connect-sleeper-settings',
  },
  {
    id: 'connected-settings',
    name: 'Connected accounts',
    description: 'Google, Apple, Yahoo sign-in, legacy imports, and more.',
    href: '/settings?tab=connected',
    testId: 'onboarding-connect-settings',
  },
]

type ConnectPlatformsModalProps = {
  open: boolean
  onClose: () => void
  /** User opened any import / settings connect flow — marks checklist progress */
  onMarkConnectIntent: () => void
}

export function ConnectPlatformsModal({ open, onClose, onMarkConnectIntent }: ConnectPlatformsModalProps) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-black/70 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="af-connect-platforms-title"
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0a1228] shadow-xl">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 id="af-connect-platforms-title" className="text-lg font-bold text-white">
            Connect a platform
          </h2>
          <p className="mt-1 text-sm text-white/55">
            Import fantasy leagues or link accounts. Use <span className="text-white/75">Import</span> for Yahoo, ESPN,
            Fantrax, MFL, and Fleaflicker previews; Discord uses secure OAuth.
          </p>
        </div>

        <ul className="divide-y divide-white/8">
          {ROWS.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-white/90">{row.name}</p>
                <p className="mt-0.5 text-xs text-white/45">{row.description}</p>
              </div>
              {row.external ? (
                <a
                  href={row.href}
                  data-testid={row.testId}
                  onClick={() => onMarkConnectIntent()}
                  className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
                >
                  Open
                </a>
              ) : (
                <Link
                  href={row.href}
                  data-testid={row.testId}
                  onClick={() => onMarkConnectIntent()}
                  className="shrink-0 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-semibold text-cyan-200 hover:bg-cyan-500/20"
                >
                  Open
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/12 px-4 py-2 text-sm font-semibold text-white/75 hover:bg-white/[0.05]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import '@/components/core-app/af-import.css'
import {
  IMPORT_PROVIDER_UI_OPTIONS,
  isImportProviderAvailable,
  supportsImportProviderDiscovery,
} from '@/lib/league-import/provider-ui-config'
import type { ImportProvider } from '@/lib/league-import/types'

/**
 * Import & connect — the "landing, auth & import" handoff, frames 4C/4D and 6A.
 *
 * ⚠ PROVIDER AVAILABILITY COMES FROM provider-ui-config, NEVER FROM THIS FILE.
 * The handoff draws six selectable providers. Only three are usable end to end:
 * sleeper, espn and yahoo. fantrax, mfl and fleaflicker each have a real adapter
 * and no working path for a real user — that config carries the audit behind
 * those values, and a test fails loudly if the list drifts from it.
 *
 * Showing all six is right; letting someone pick one that cannot finish is not.
 * Unavailable providers render disabled with the reason, because "Fantrax" as a
 * live option is a promise the import cannot keep, and the user only discovers
 * that after handing over a league.
 *
 * ⚠ YAHOO TAKES NO IDENTIFIER. It discovers leagues from the user's CONNECTED
 * Yahoo account over OAuth, so the handoff's "each provider swaps its own field"
 * does not hold for it — asking for a Yahoo username would be asking for
 * something the import never uses.
 *
 * The promise is repeated on every step, per the handoff: we only read league
 * history — no passwords, no posting, ever.
 */

export type ImportPreviewState = 'pick' | 'connecting' | 'result'

const FIELD_BY_PROVIDER: Partial<Record<ImportProvider, { label: string; placeholder: string; help: string }>> = {
  sleeper: {
    label: 'Sleeper username',
    placeholder: 'your-sleeper-username',
    help: 'We look up your public leagues from this username. No password, ever.',
  },
  espn: {
    label: 'ESPN league ID',
    placeholder: '123456',
    help: 'Public leagues import directly. Private leagues use the browser extension — we never ask for your ESPN password.',
  },
}

/** Why an unavailable provider cannot be used, in the user's terms. */
const BLOCKED_REASON: Partial<Record<ImportProvider, string>> = {
  fantrax: 'Upload pipeline is not accepting new leagues yet.',
  mfl: 'Private MFL leagues need an API key, and there is no way to enter one yet.',
  fleaflicker: 'No connected path from this flow yet.',
}

function ReadOnlyPromise() {
  return (
    <p className="af-im-promise">
      <span className="af-readonly">Read-only</span>
      We only read your league history — no passwords, no posting, ever.
    </p>
  )
}

export function ImportV4({ state = 'pick' }: { state?: ImportPreviewState }) {
  const [provider, setProvider] = useState<ImportProvider>('sleeper')
  const selectable = isImportProviderAvailable(provider)
  const field = FIELD_BY_PROVIDER[provider]

  return (
    <div className="af-core af-im">
      <header className="af-im-head">
        <span className="af-label">Connect your league to AllFantasy</span>
        <h1 className="af-im-title">Connect your league in seconds.</h1>
        <p className="af-im-sub">
          Pick your platform and drop in your username or league ID. We build a read-only copy of
          your real rosters, matchups and scoring.
        </p>
      </header>

      {/* ── Step 1: provider picker ─────────────────────────────────── */}
      <section className="af-im-card">
        <h2 className="af-label">Where do you already play?</h2>

        <div className="af-im-providers">
          {IMPORT_PROVIDER_UI_OPTIONS.map((opt) => {
            const available = opt.available
            const active = provider === opt.provider
            return (
              <button
                key={opt.provider}
                type="button"
                className="af-im-provider"
                data-active={active}
                data-available={available}
                disabled={!available}
                aria-disabled={!available}
                onClick={() => available && setProvider(opt.provider)}
              >
                <span className="af-im-provider-top">
                  <span className="af-platform af-im-mark" data-platform={opt.provider}>
                    {opt.label.charAt(0)}
                  </span>
                  <span className="af-im-provider-label">{opt.label}</span>
                  {!available ? <span className="af-im-soon af-num">soon</span> : null}
                </span>
                <span className="af-im-provider-meta">
                  {available
                    ? supportsImportProviderDiscovery(opt.provider)
                      ? 'Finds your leagues automatically'
                      : 'League ID · read-only'
                    : BLOCKED_REASON[opt.provider] ?? 'Not connectable yet.'}
                </span>
                <span className="af-im-provider-sports af-num">
                  {opt.supportedSports.join(' · ')}
                </span>
              </button>
            )
          })}
        </div>

        {/* ── Step 2: the provider's own field ──────────────────────── */}
        {selectable ? (
          <div className="af-im-field-block">
            {field ? (
              <label className="af-im-field">
                <span className="af-label">{field.label}</span>
                <input type="text" placeholder={field.placeholder} />
                <span className="af-im-field-help">{field.help}</span>
              </label>
            ) : (
              /*
                Yahoo lands here. It has no identifier field at all — leagues come
                from the connected account over OAuth — so the step is a connect
                action, not a text input.
              */
              <div className="af-im-field">
                <span className="af-label">Yahoo account</span>
                <p className="af-im-field-help">
                  Yahoo lists leagues from the account you connect — there is no username to enter.
                  You will be sent to Yahoo to approve read-only access.
                </p>
              </div>
            )}

            <button type="button" className="af-btn af-im-submit">
              {/*
                "Find my leagues" only makes sense when the user typed something
                to search from. Yahoo supports discovery but takes no identifier —
                it sends you to Yahoo to approve access — so the same label there
                would promise a search of something that was never entered.
              */}
              {!field
                ? 'Connect Yahoo'
                : supportsImportProviderDiscovery(provider)
                  ? 'Find my leagues'
                  : 'Connect'}
            </button>
          </div>
        ) : null}

        <ReadOnlyPromise />
      </section>

      {/* ── Connecting ──────────────────────────────────────────────── */}
      {state === 'connecting' ? (
        <section className="af-im-card">
          <h2 className="af-label">Connecting</h2>
          {/*
            Determinate, per the handoff. An indeterminate spinner cannot say how
            far along an import is, and this one runs long enough that people
            leave.
          */}
          <div className="af-im-progress" role="progressbar" aria-valuenow={40} aria-valuemin={0} aria-valuemax={100}>
            <span className="af-im-progress-bar" style={{ width: '40%' }} />
          </div>
          <p className="af-im-progress-text">
            Reading leagues… <span className="af-num">2 of 5</span>
          </p>
          <ReadOnlyPromise />
        </section>
      ) : null}

      {/* ── Result ──────────────────────────────────────────────────── */}
      {state === 'result' ? (
        <section className="af-im-card">
          <header className="af-im-result-head">
            <h2 className="af-label">What we found</h2>
            <span className="af-chip af-num">preview state</span>
          </header>

          {/*
            ⚠ This is a PREVIEW of the result layout, reached only via ?state=result.
            It carries no league data, because inventing "found 4 leagues" on a
            screen whose entire promise is that the leagues are real would be the
            worst possible place to fabricate. The live flow fills this from the
            import job.
          */}
          <p className="af-im-empty">
            Layout preview only — no import has run, so there are no leagues to list. The live flow
            fills this from the import job, one row per league found, and failures name the provider
            with a retry that does not restart the flow.
          </p>
          <ReadOnlyPromise />
        </section>
      ) : null}
    </div>
  )
}

export default ImportV4

import type { ReactNode } from 'react'

export function MetricCard({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-[11px] uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-1 text-lg font-semibold text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-white/50">{hint}</p>}
    </div>
  )
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function primitive(value: unknown): string {
  if (value === null || value === undefined) return '-'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return `${value.length} items`
  return 'object'
}

export function SmartDataView({ data }: { data: unknown }) {
  if (!data) return <p className="text-sm text-white/60">No data returned.</p>

  if (Array.isArray(data)) {
    if (!data.length) return <p className="text-sm text-white/60">No rows yet.</p>
    const firstObj = data.find((r) => r && typeof r === 'object' && !Array.isArray(r)) as Record<string, unknown> | undefined
    if (!firstObj) {
      return (
        <ul className="space-y-2 text-sm text-white/80">
          {data.slice(0, 20).map((item, idx) => (
            <li key={idx} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">{primitive(item)}</li>
          ))}
        </ul>
      )
    }

    const cols = Object.keys(firstObj).slice(0, 6)
    return (
      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-xs text-white/80">
          <thead className="bg-white/5 text-white/60">
            <tr>
              {cols.map((col) => (
                <th key={col} className="px-3 py-2 font-medium">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 25).map((row, idx) => {
              const obj = asObject(row) || {}
              return (
                <tr key={idx} className="border-t border-white/10">
                  {cols.map((col) => (
                    <td key={col} className="px-3 py-2 align-top">{primitive(obj[col])}</td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  const obj = asObject(data)
  if (!obj) {
    return <p className="text-sm text-white/80">{primitive(data)}</p>
  }

  const entries = Object.entries(obj)
  if (!entries.length) return <p className="text-sm text-white/60">No fields available.</p>

  return (
    <dl className="grid gap-2 sm:grid-cols-2">
      {entries.slice(0, 24).map(([key, value]) => (
        <div key={key} className="rounded-lg border border-white/10 bg-black/30 px-3 py-2">
          <dt className="text-[11px] uppercase tracking-wide text-white/45">{key}</dt>
          <dd className="mt-1 text-sm text-white/85">{primitive(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

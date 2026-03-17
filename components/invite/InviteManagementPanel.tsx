'use client'

import { useCallback, useEffect, useState } from 'react'
import { Copy, Trash2 } from 'lucide-react'

interface InviteRow {
  id: string
  type: string
  token: string
  targetId: string | null
  status: string
  useCount: number
  maxUses: number
  expiresAt: string | null
  createdAt: string
  inviteUrl: string
}

export interface InviteManagementPanelProps {
  type?: string
}

export function InviteManagementPanel({ type }: InviteManagementPanelProps) {
  const [links, setLinks] = useState<InviteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const fetchLinks = useCallback(() => {
    const q = type ? `?type=${encodeURIComponent(type)}` : ''
    fetch(`/api/invite/list${q}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.links)) setLinks(data.links)
        else setLinks([])
      })
      .catch(() => setLinks([]))
      .finally(() => setLoading(false))
  }, [type])

  useEffect(() => {
    fetchLinks()
  }, [fetchLinks])

  const copyUrl = (row: InviteRow) => {
    navigator.clipboard.writeText(row.inviteUrl).then(() => {
      setCopiedId(row.id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const revoke = (id: string) => {
    if (!confirm('Revoke this invite link? It will no longer work.')) return
    fetch('/api/invite/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteLinkId: id }),
    }).then(() => fetchLinks())
  }

  if (loading) {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Loading…</p>
      </div>
    )
  }

  if (links.length === 0) {
    return (
      <div className="rounded-xl border p-6 text-center" style={{ borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>No invite links yet. Create one from a league or your referral dashboard.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: 'var(--panel2)' }}>
              <th className="text-left p-3 font-semibold" style={{ color: 'var(--text)' }}>Type</th>
              <th className="text-left p-3 font-semibold" style={{ color: 'var(--text)' }}>Status</th>
              <th className="text-left p-3 font-semibold" style={{ color: 'var(--text)' }}>Uses</th>
              <th className="text-left p-3 font-semibold" style={{ color: 'var(--text)' }}>Created</th>
              <th className="text-right p-3 font-semibold" style={{ color: 'var(--text)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {links.map((row) => (
              <tr key={row.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                <td className="p-3">{row.type}</td>
                <td className="p-3">{row.status}</td>
                <td className="p-3">{row.useCount}{row.maxUses > 0 ? ` / ${row.maxUses}` : ''}</td>
                <td className="p-3 text-xs" style={{ color: 'var(--muted)' }}>
                  {new Date(row.createdAt).toLocaleDateString()}
                </td>
                <td className="p-3 text-right">
                  <button
                    type="button"
                    onClick={() => copyUrl(row)}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium mr-2"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    <Copy className="h-3 w-3" />
                    {copiedId === row.id ? 'Copied' : 'Copy'}
                  </button>
                  {row.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => revoke(row.id)}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium"
                      style={{ color: 'var(--destructive)', border: '1px solid var(--destructive)' }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

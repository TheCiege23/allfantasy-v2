'use client'

import { useState } from 'react'
import type { CreatorBranding } from '@/lib/creator-system/types'

export interface CreatorBrandingEditorProps {
  initialBranding: CreatorBranding | null
  creatorIdOrSlug: string
  onSaved?: (branding: CreatorBranding) => void
}

export function CreatorBrandingEditor({
  initialBranding,
  creatorIdOrSlug,
  onSaved,
}: CreatorBrandingEditorProps) {
  const [logoUrl, setLogoUrl] = useState(initialBranding?.logoUrl ?? '')
  const [primaryColor, setPrimaryColor] = useState(initialBranding?.primaryColor ?? '')
  const [accentColor, setAccentColor] = useState(initialBranding?.accentColor ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/creators/${encodeURIComponent(creatorIdOrSlug)}/branding`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          logoUrl: logoUrl || undefined,
          primaryColor: primaryColor || undefined,
          accentColor: accentColor || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Failed to save')
        return
      }
      onSaved?.({ logoUrl: logoUrl || undefined, primaryColor: primaryColor || undefined, accentColor: accentColor || undefined })
    } catch (e) {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ borderColor: 'var(--border)', background: 'color-mix(in srgb, var(--panel) 40%, transparent)' }}
    >
      <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>
        Branding
      </h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
            Logo URL
          </label>
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="https://..."
            className="w-full rounded-lg border px-3 py-2 text-sm bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
            Primary color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={primaryColor || '#22c55e'}
              onChange={(e) => setPrimaryColor(e.target.value)}
              className="w-10 h-10 rounded border cursor-pointer"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              type="text"
              value={primaryColor}
              onChange={(e) => setPrimaryColor(e.target.value)}
              placeholder="#22c55e"
              className="flex-1 rounded-lg border px-3 py-2 text-sm bg-transparent font-mono"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--muted)' }}>
            Accent color
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={accentColor || '#3b82f6'}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-10 h-10 rounded border cursor-pointer"
              style={{ borderColor: 'var(--border)' }}
            />
            <input
              type="text"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              placeholder="#3b82f6"
              className="flex-1 rounded-lg border px-3 py-2 text-sm bg-transparent font-mono"
              style={{ borderColor: 'var(--border)', color: 'var(--text)' }}
            />
          </div>
        </div>
        {error && (
          <p className="text-sm" style={{ color: 'var(--destructive)' }}>
            {error}
          </p>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={handleSave}
          className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
          style={{ background: 'var(--accent)', color: 'var(--bg)' }}
        >
          {saving ? 'Saving…' : 'Save branding'}
        </button>
      </div>
    </div>
  )
}

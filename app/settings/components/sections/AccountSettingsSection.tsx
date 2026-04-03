"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

export function AccountSettingsSection({
  accountCreatedAt,
  planLabel,
}: {
  accountCreatedAt: string | null
  planLabel: string | null
}) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState("")

  const createdLabel = accountCreatedAt
    ? new Date(accountCreatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null

  const planDisplay = planLabel?.trim() || "Free"

  const deletionMailto = `mailto:support@allfantasy.ai?subject=${encodeURIComponent(
    "Account deletion request"
  )}&body=${encodeURIComponent(
    "I confirm I want my AllFantasy account deleted. My username / email on file: "
  )}`

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold" style={{ color: "var(--text)" }}>Account</h2>
        <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
          Plan, member since, sign out, and account deletion.
        </p>
      </div>

      <div
        className="rounded-xl border p-4 space-y-3"
        style={{ borderColor: "var(--border)", background: "var(--panel2)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium" style={{ color: "var(--text)" }}>Plan</span>
          <span
            className="rounded-full border px-3 py-0.5 text-xs font-semibold"
            style={{ borderColor: "var(--accent-cyan)", color: "var(--accent-cyan)" }}
          >
            {planDisplay}
          </span>
        </div>
        {createdLabel && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Member since {createdLabel}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="rounded-xl border px-4 py-2 text-sm font-semibold"
          style={{ borderColor: "var(--border)", color: "var(--text)" }}
          data-testid="settings-account-sign-out"
        >
          Sign out
        </button>
      </div>

      <div className="rounded-xl border border-red-500/30 p-4 space-y-3" style={{ background: "var(--panel2)" }}>
        <p className="text-sm font-medium" style={{ color: "var(--accent-red-strong)" }}>Delete account</p>
        <p className="text-xs" style={{ color: "var(--muted)" }}>
          This is permanent. To proceed, open the confirmation and type DELETE exactly, then contact support to complete
          verification.
        </p>
        <button
          type="button"
          onClick={() => {
            setDeleteOpen(true)
            setDeleteConfirm("")
          }}
          className="rounded-xl border px-4 py-2 text-sm font-semibold"
          style={{
            borderColor: "color-mix(in srgb, var(--accent-red) 55%, var(--border))",
            color: "var(--accent-red-strong)",
          }}
          data-testid="settings-account-delete-open"
        >
          Start account deletion
        </button>
      </div>

      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-account-title"
        >
          <div
            className="w-full max-w-md rounded-2xl border p-5 shadow-xl"
            style={{ borderColor: "var(--border)", background: "var(--panel)" }}
          >
            <h3 id="delete-account-title" className="text-lg font-semibold" style={{ color: "var(--text)" }}>
              Confirm account deletion
            </h3>
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              Type <span className="font-mono font-semibold text-white">DELETE</span> to unlock the support email. We
              will verify ownership before removing data.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ borderColor: "var(--border)", background: "var(--panel2)", color: "var(--text)" }}
              placeholder="DELETE"
              autoComplete="off"
              data-testid="settings-account-delete-confirm-input"
            />
            <div className="mt-4 flex flex-wrap gap-2">
              {deleteConfirm === "DELETE" ? (
                <a
                  href={deletionMailto}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold"
                  style={{
                    borderColor: "color-mix(in srgb, var(--accent-red) 55%, var(--border))",
                    color: "var(--accent-red-strong)",
                  }}
                  data-testid="settings-account-delete-email"
                >
                  Email support to delete
                </a>
              ) : (
                <span
                  className="rounded-xl border px-4 py-2 text-sm font-semibold opacity-40"
                  style={{
                    borderColor: "color-mix(in srgb, var(--accent-red) 55%, var(--border))",
                    color: "var(--accent-red-strong)",
                  }}
                >
                  Email support to delete
                </span>
              )}
              <button
                type="button"
                onClick={() => setDeleteOpen(false)}
                className="rounded-xl border px-4 py-2 text-sm font-semibold"
                style={{ borderColor: "var(--border)", color: "var(--text)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--muted)" }}>
        Final deletion is completed by support after identity checks.
      </p>
    </div>
  )
}

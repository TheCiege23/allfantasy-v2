/**
 * Lightweight CSV export utilities for admin dashboards.
 */

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? "")
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function buildCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const headerLine = headers.map(escapeCsvCell).join(",")
  const body = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n")
  return `${headerLine}\n${body}`
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<unknown>>) {
  if (typeof window === "undefined") return
  const csv = buildCsv(headers, rows)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = window.URL.createObjectURL(blob)
  const link = window.document.createElement("a")
  link.href = url
  link.setAttribute("download", filename)
  window.document.body.appendChild(link)
  link.click()
  window.document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

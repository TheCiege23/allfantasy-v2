/**
 * Shared HTML builder for email-verification emails.
 *
 * WHY INLINE STYLES + TABLE LAYOUT:
 * Gmail (web), Outlook, and most mobile email clients strip <style> blocks
 * entirely. If colours live in CSS classes the email renders as white text
 * on a white/light background — unreadable. Every colour and layout
 * property must be on the element itself via style="".
 *
 * The dark background (#0f172a / #1e293b) is applied on every <td>, not
 * just the <body>, so it survives Gmail's aggressive CSS normalisation.
 *
 * The CTA button uses background-color on the <td> (Outlook-safe) AND on
 * the <a> element (Gmail/mobile-safe), so it stays visible in all clients.
 */

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Returns a display-safe name for the email greeting.
 *
 * Rules (matches the display-privacy policy):
 *   - Prefer username (always alphanumeric, user-chosen).
 *   - Accept displayName only if it contains no "@" (i.e. is not an email).
 *   - Fall back to "there" — never expose an email prefix.
 */
export function resolveEmailSafeName(opts: {
  username?: string | null
  displayName?: string | null
}): string {
  const name =
    opts.username?.trim() ||
    opts.displayName?.trim() ||
    ''
  if (!name || name.includes('@')) return 'there'
  return name // plain text — buildVerificationEmailHtml will HTML-encode it
}

/**
 * Builds high-contrast, email-client-safe HTML for a verification email.
 *
 * All parameters are plain text — they are HTML-escaped internally.
 * The verifyUrl is also escaped for safe insertion into href attributes.
 */
export function buildVerificationEmailHtml(opts: {
  /** H1 heading shown in the email */
  title: string
  /** Body paragraph beneath the heading */
  greeting: string
  /** Full verification URL, including token and any returnTo param */
  verifyUrl: string
  /** Small footer note, e.g. "If you didn't create this account…" */
  footerNote: string
}): string {
  const safeTitle    = escapeHtml(opts.title)
  const safeGreeting = escapeHtml(opts.greeting)
  const safeFooter   = escapeHtml(opts.footerNote)
  // URL: escape & → &amp; for HTML attributes; token remains URL-encoded
  const safeUrl      = escapeHtml(opts.verifyUrl)

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${safeTitle}</title>
</head>
<body style="margin:0;padding:0;background-color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

  <!-- Outer wrapper — inline background-color so Gmail doesn't show white -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
    <tr>
      <td style="background-color:#0f172a;padding:32px 16px;" align="center">

        <!-- Card -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:520px;">

          <!-- Brand header -->
          <tr>
            <td style="background-color:#1e293b;padding:28px 32px 20px;text-align:center;border-radius:12px 12px 0 0;border-bottom:1px solid #334155;">
              <span style="font-size:26px;font-weight:700;color:#22d3ee;letter-spacing:-0.5px;">AllFantasy.ai</span>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="background-color:#1e293b;padding:36px 32px 28px;text-align:center;">
              <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#f1f5f9;line-height:1.3;">${safeTitle}</h1>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#cbd5e1;">${safeGreeting}</p>

              <!-- CTA button
                   background-color on <td>  = renders in Outlook (Word engine)
                   background-color on <a>   = renders in Gmail / mobile when <td> bg is stripped
                   color:#ffffff on <a>      = white text always explicit — never inherit -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#2563eb;border-radius:8px;">
                    <a href="${safeUrl}"
                       style="display:inline-block;padding:14px 40px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#2563eb;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">This link expires in 1 hour.</p>

              <!-- Plain-text fallback — shown if the button is clipped or blocked -->
              <p style="margin:28px 0 6px;font-size:12px;color:#94a3b8;">
                If the button doesn&apos;t work, copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:12px;word-break:break-all;">
                <a href="${safeUrl}" style="color:#38bdf8;text-decoration:underline;">${safeUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#1e293b;padding:16px 32px 28px;text-align:center;border-top:1px solid #334155;border-radius:0 0 12px 12px;">
              <p style="margin:0;font-size:12px;color:#64748b;">${safeFooter}</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}

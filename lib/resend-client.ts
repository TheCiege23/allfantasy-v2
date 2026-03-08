import { Resend } from "resend"

type ResendClientResult = {
  client: Resend
  fromEmail: string
  source: "env"
}

export async function getResendClient(): Promise<ResendClientResult> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail =
    process.env.RESEND_FROM || "AllFantasy.ai <noreply@allfantasy.ai>"

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is missing")
  }

  return {
    client: new Resend(apiKey),
    fromEmail,
    source: "env",
  }
}

export function invalidateResendCredentialsCache() {
  return
}

export async function sendTradeAlertConfirmationEmail(
  to: string,
  sleeperUsername: string
) {
  const { client, fromEmail } = await getResendClient()

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 32px; border: 1px solid #334155; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 28px; font-weight: bold; background: linear-gradient(90deg, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .check { display: inline-block; width: 64px; height: 64px; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); border-radius: 50%; line-height: 64px; text-align: center; font-size: 32px; margin: 16px 0; }
    .message { text-align: center; color: #f1f5f9; font-size: 18px; margin: 16px 0; }
    .info-box { background: rgba(34, 211, 238, 0.1); border-left: 3px solid #22d3ee; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; }
    .cta { display: block; text-align: center; background: linear-gradient(90deg, #22d3ee, #a855f7); color: white; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 600; margin-top: 24px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">AllFantasy.ai</div>
    </div>

    <div style="text-align: center;">
      <div class="check">✓</div>
      <h2 style="margin: 8px 0; color: #4ade80;">Trade Alerts Enabled!</h2>
    </div>

    <p class="message">You're all set, <strong>${sleeperUsername}</strong>!</p>

    <div class="info-box">
      <strong style="color: #22d3ee;">What happens next?</strong>
      <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #e2e8f0;">
        <li>We'll scan your leagues for new trades</li>
        <li>Every trade gets instant AI analysis with letter grades</li>
        <li>You'll receive email alerts when trades happen</li>
        <li>See who won and get counter-offer suggestions</li>
      </ul>
    </div>

    <a href="https://allfantasy.ai/af-legacy" class="cta">View Your Legacy Dashboard</a>

    <div class="footer">
      <p>You can manage your email preferences anytime in your AF Legacy dashboard.</p>
      <p style="color: #475569;">AllFantasy.ai - AI-Powered Fantasy Sports</p>
    </div>
  </div>
</body>
</html>
`

  await client.emails.send({
    from: fromEmail || "AllFantasy.ai <alerts@allfantasy.ai>",
    to,
    subject: "Trade Alerts Enabled - AllFantasy.ai",
    html,
  })
}

export async function sendTradeAlertEmail(
  to: string,
  tradeSummary: {
    leagueName: string
    senderName: string
    receiverName: string
    playersGiven: string[]
    playersReceived: string[]
    aiGrade: string
    aiVerdict: string
    expertAnalysis: string
    transactionId?: string
  }
) {
  const { client, fromEmail } = await getResendClient()

  const gradeClass = tradeSummary.aiGrade.toLowerCase().charAt(0)

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #e2e8f0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; padding: 32px; border: 1px solid #334155; }
    .header { text-align: center; margin-bottom: 24px; }
    .logo { font-size: 24px; font-weight: bold; background: linear-gradient(90deg, #22d3ee, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .grade { display: inline-block; font-size: 32px; font-weight: bold; padding: 8px 24px; border-radius: 12px; margin: 16px 0; }
    .grade-a { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
    .grade-b { background: rgba(34, 211, 238, 0.2); color: #22d3ee; }
    .grade-c { background: rgba(234, 179, 8, 0.2); color: #facc15; }
    .grade-d, .grade-f { background: rgba(239, 68, 68, 0.2); color: #f87171; }
    .trade-box { background: rgba(0, 0, 0, 0.3); border-radius: 12px; padding: 16px; margin: 16px 0; }
    .trade-side { margin-bottom: 12px; }
    .trade-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; margin-bottom: 4px; }
    .trade-players { color: #f1f5f9; }
    .analysis { background: rgba(168, 85, 247, 0.1); border-left: 3px solid #a855f7; padding: 16px; margin: 16px 0; border-radius: 0 8px 8px 0; }
    .cta { display: block; text-align: center; background: linear-gradient(90deg, #22d3ee, #a855f7); color: white; text-decoration: none; padding: 14px 24px; border-radius: 12px; font-weight: 600; margin-top: 24px; }
    .footer { text-align: center; margin-top: 24px; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">AllFantasy.ai</div>
      <h2 style="margin: 8px 0; color: #f1f5f9;">New Trade Alert!</h2>
      <p style="color: #94a3b8; margin: 0;">${tradeSummary.leagueName}</p>
    </div>

    <div style="text-align: center;">
      <div class="grade grade-${gradeClass}">${tradeSummary.aiGrade}</div>
      <p style="color: #94a3b8; margin: 4px 0;">${tradeSummary.aiVerdict}</p>
    </div>

    <div class="trade-box">
      <div class="trade-side">
        <div class="trade-label">${tradeSummary.senderName} receives:</div>
        <div class="trade-players">${tradeSummary.playersReceived.join(", ") || "Draft picks"}</div>
      </div>
      <div class="trade-side">
        <div class="trade-label">${tradeSummary.receiverName} receives:</div>
        <div class="trade-players">${tradeSummary.playersGiven.join(", ") || "Draft picks"}</div>
      </div>
    </div>

    <div class="analysis">
      <strong style="color: #a855f7;">AI Analysis:</strong>
      <p style="margin: 8px 0 0 0; color: #e2e8f0;">${tradeSummary.expertAnalysis}</p>
    </div>

    <a href="https://allfantasy.ai/af-legacy?tab=notifications${tradeSummary.transactionId ? `&trade=${tradeSummary.transactionId}` : ""}" class="cta">View Full Analysis</a>

    <div class="footer">
      <p>You're receiving this because you enabled trade alerts on AllFantasy.ai</p>
    </div>
  </div>
</body>
</html>
`

  await client.emails.send({
    from: fromEmail || "AllFantasy.ai <alerts@allfantasy.ai>",
    to,
    subject: `${tradeSummary.aiGrade} Trade in ${tradeSummary.leagueName} - AllFantasy.ai`,
    html,
  })
}
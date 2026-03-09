import "server-only";
import { Resend } from "resend";
import { getBaseUrl } from "@/lib/get-base-url";

type ResendClientResult = {
  client: Resend;
  fromEmail: string;
};

type TradeSummary = {
  leagueName: string;
  senderName: string;
  receiverName: string;
  playersGiven: string[];
  playersReceived: string[];
  aiGrade: string;
  aiVerdict: string;
  expertAnalysis: string;
  transactionId?: string;
};

let resendClient: Resend | undefined;

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is not set. Add it to your local environment and Vercel project settings.`
    );
  }

  return value;
}

function getResendFromEmail(): string {
  return (
    process.env.RESEND_FROM?.trim() ||
    "AllFantasy.ai <noreply@allfantasy.ai>"
  );
}

export function getResendClient(): ResendClientResult {
  if (!resendClient) {
    resendClient = new Resend(getRequiredEnv("RESEND_API_KEY"));
  }

  return {
    client: resendClient,
    fromEmail: getResendFromEmail(),
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatList(values: string[]): string {
  if (!values.length) return "Draft picks";
  return values.map(escapeHtml).join(", ");
}

function getLegacyDashboardUrl(): string {
  return `${getBaseUrl()}/af-legacy`;
}

function getTradeAnalysisUrl(transactionId?: string): string {
  const baseUrl = `${getBaseUrl()}/af-legacy?tab=notifications`;
  return transactionId
    ? `${baseUrl}&trade=${encodeURIComponent(transactionId)}`
    : baseUrl;
}

async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
}) {
  const { client, fromEmail } = getResendClient();

  const result = await client.emails.send({
    from: fromEmail,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });

  if ("error" in result && result.error) {
    throw new Error(
      `[resend] Failed to send email: ${result.error.message || "Unknown error"}`
    );
  }

  return result;
}

export function invalidateResendCredentialsCache(): void {
  resendClient = undefined;
}

export async function sendTradeAlertConfirmationEmail(
  to: string,
  sleeperUsername: string
) {
  const safeSleeperUsername = escapeHtml(sleeperUsername);
  const dashboardUrl = getLegacyDashboardUrl();

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <div>
    <h2>Trade Alerts Enabled!</h2>
    <p>You're all set, <strong>${safeSleeperUsername}</strong>!</p>
    <a href="${dashboardUrl}">View Your Legacy Dashboard</a>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject: "Trade Alerts Enabled - AllFantasy.ai",
    html,
  });
}

export async function sendTradeAlertEmail(
  to: string,
  tradeSummary: TradeSummary
) {
  const safeLeagueName = escapeHtml(tradeSummary.leagueName);
  const safeSenderName = escapeHtml(tradeSummary.senderName);
  const safeReceiverName = escapeHtml(tradeSummary.receiverName);
  const safeAiGrade = escapeHtml(tradeSummary.aiGrade);
  const safeAiVerdict = escapeHtml(tradeSummary.aiVerdict);
  const safeExpertAnalysis = escapeHtml(tradeSummary.expertAnalysis);
  const analysisUrl = getTradeAnalysisUrl(tradeSummary.transactionId);

  const normalizedGrade = tradeSummary.aiGrade.trim().toLowerCase();
  const gradeClass = /^[abcdf]/.test(normalizedGrade)
    ? normalizedGrade.charAt(0)
    : "c";

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <div>
    <h2>New Trade Alert!</h2>
    <p>${safeLeagueName}</p>
    <div class="grade grade-${gradeClass}">${safeAiGrade}</div>
    <p>${safeAiVerdict}</p>
    <p>${safeSenderName} receives: ${formatList(tradeSummary.playersReceived)}</p>
    <p>${safeReceiverName} receives: ${formatList(tradeSummary.playersGiven)}</p>
    <p>${safeExpertAnalysis}</p>
    <a href="${analysisUrl}">View Full Analysis</a>
  </div>
</body>
</html>`;

  return sendEmail({
    to,
    subject: `${safeAiGrade} Trade in ${safeLeagueName} - AllFantasy.ai`,
    html,
  });
}
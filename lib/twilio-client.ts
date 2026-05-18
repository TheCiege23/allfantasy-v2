import "server-only"
import twilio from "twilio"

let twilioClient: ReturnType<typeof twilio> | undefined

export type TwilioRuntimeStatus = {
  hasAccountSid: boolean
  hasAuthToken: boolean
  hasApiKey: boolean
  hasApiSecret: boolean
  hasFromNumber: boolean
  hasVerifyServiceSid: boolean
  canUseAuthTokenMode: boolean
  canUseApiKeyMode: boolean
  canUseRawSms: boolean
  canUseVerify: boolean
}

export type SanitizedTwilioError = {
  code?: string | number
  status?: string | number
  message: string
  moreInfo?: string
}

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(
      `${name} is not set. Add it to your local environment and Vercel project settings.`
    )
  }

  return value
}

export function getTwilioRuntimeStatus(): TwilioRuntimeStatus {
  const hasAccountSid = Boolean(process.env.TWILIO_ACCOUNT_SID?.trim())
  const hasAuthToken = Boolean(process.env.TWILIO_AUTH_TOKEN?.trim())
  const hasApiKey = Boolean(process.env.TWILIO_API_KEY?.trim())
  const hasApiSecret = Boolean(process.env.TWILIO_API_SECRET?.trim())
  const hasFromNumber = Boolean(process.env.TWILIO_PHONE_NUMBER?.trim())
  const hasVerifyServiceSid = Boolean(process.env.TWILIO_VERIFY_SERVICE_SID?.trim())
  const canUseAuthTokenMode = hasAccountSid && hasAuthToken
  const canUseApiKeyMode = hasAccountSid && hasApiKey && hasApiSecret
  const canAuthenticate = canUseAuthTokenMode || canUseApiKeyMode

  return {
    hasAccountSid,
    hasAuthToken,
    hasApiKey,
    hasApiSecret,
    hasFromNumber,
    hasVerifyServiceSid,
    canUseAuthTokenMode,
    canUseApiKeyMode,
    canUseRawSms: canAuthenticate && hasFromNumber,
    canUseVerify: canAuthenticate && hasVerifyServiceSid,
  }
}

export function sanitizeTwilioError(error: unknown): SanitizedTwilioError {
  if (error && typeof error === "object") {
    const record = error as {
      code?: unknown
      status?: unknown
      statusCode?: unknown
      message?: unknown
      moreInfo?: unknown
      more_info?: unknown
    }

    return {
      code:
        typeof record.code === "string" || typeof record.code === "number"
          ? record.code
          : undefined,
      status:
        typeof record.status === "string" || typeof record.status === "number"
          ? record.status
          : typeof record.statusCode === "string" || typeof record.statusCode === "number"
            ? record.statusCode
            : undefined,
      message:
        typeof record.message === "string" && record.message.trim()
          ? record.message
          : "Twilio request failed.",
      moreInfo:
        typeof record.moreInfo === "string"
          ? record.moreInfo
          : typeof record.more_info === "string"
            ? record.more_info
            : undefined,
    }
  }

  return {
    message: error instanceof Error ? error.message : "Twilio request failed.",
  }
}

export function getTwilioClient() {
  if (twilioClient) {
    return twilioClient
  }

  const accountSid = getRequiredEnv("TWILIO_ACCOUNT_SID")
  const apiKey = process.env.TWILIO_API_KEY?.trim()
  const apiKeySecret = process.env.TWILIO_API_SECRET?.trim()
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()

  if (apiKey && apiKeySecret) {
    twilioClient = twilio(apiKey, apiKeySecret, { accountSid })
    return twilioClient
  }

  if (authToken) {
    twilioClient = twilio(accountSid, authToken)
    return twilioClient
  }

  throw new Error(
    "Twilio credentials missing. Set TWILIO_API_KEY + TWILIO_API_SECRET, or TWILIO_AUTH_TOKEN."
  )
}

export function getTwilioFromPhoneNumber() {
  return getRequiredEnv("TWILIO_PHONE_NUMBER")
}

/**
 * Send an SMS. Returns false if Twilio is not configured or send fails (no throw).
 */
export async function sendSms(toPhone: string, body: string): Promise<boolean> {
  const status = getTwilioRuntimeStatus()
  const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim()
  if (!status.canUseRawSms || !fromNumber) {
    console.error("[twilio] SMS send skipped", {
      reason: "raw_sms_not_configured",
      status,
    })
    return false
  }

  try {
    const client = getTwilioClient()
    await client.messages.create({
      from: fromNumber,
      to: toPhone,
      body: body.slice(0, 1600),
    })
    return true
  } catch (error) {
    console.error("[twilio] SMS send failed", sanitizeTwilioError(error))
    return false
  }
}

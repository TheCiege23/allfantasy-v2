import "server-only"
import twilio from "twilio"

let twilioClient: ReturnType<typeof twilio> | undefined

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(
      `${name} is not set. Add it to your local environment and Vercel project settings.`
    )
  }

  return value
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
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim()
  const fromNumber = process.env.TWILIO_PHONE_NUMBER?.trim()
  if (!accountSid || !fromNumber) return false
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim()
  const apiKey = process.env.TWILIO_API_KEY?.trim()
  const apiKeySecret = process.env.TWILIO_API_SECRET?.trim()
  if (!authToken && !(apiKey && apiKeySecret)) return false

  try {
    const client = getTwilioClient()
    await client.messages.create({
      from: fromNumber,
      to: toPhone,
      body: body.slice(0, 1600),
    })
    return true
  } catch {
    return false
  }
}

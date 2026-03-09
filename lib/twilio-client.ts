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
  const apiKey = getRequiredEnv("TWILIO_API_KEY")
  const apiKeySecret = getRequiredEnv("TWILIO_API_SECRET")

  twilioClient = twilio(apiKey, apiKeySecret, { accountSid })

  return twilioClient
}

export function getTwilioFromPhoneNumber() {
  return getRequiredEnv("TWILIO_PHONE_NUMBER")
}
import twilio from "twilio"

export function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const apiKey = process.env.TWILIO_API_KEY
  const apiKeySecret = process.env.TWILIO_API_SECRET

  if (!accountSid || !apiKey || !apiKeySecret) {
    throw new Error("Twilio environment variables are missing")
  }

  return twilio(apiKey, apiKeySecret, { accountSid })
}

export function getTwilioFromPhoneNumber() {
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER
  if (!phoneNumber) {
    throw new Error("TWILIO_PHONE_NUMBER is missing")
  }
  return phoneNumber
}
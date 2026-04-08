import "server-only"
import { v2 } from '@google-cloud/translate'

const { Translate } = v2

const REQUEST_BATCH_SIZE = 40
const REQUEST_TIMEOUT_MS = 12000

const googleTranslate = new Translate({
  projectId: process.env.GOOGLE_PROJECT_ID,
  key: process.env.GOOGLE_TRANSLATE_API_KEY,
})

function isTemplateHeavy(value: string): boolean {
  return value.includes("{{") || value.includes("}}")
}

export async function translateMissingEnglishKeysWithGoogle(entries: Record<string, string>, targetLang = 'es'): Promise<Record<string, string>> {
  const keys = Object.keys(entries)
  const values = Object.values(entries)
  const result: Record<string, string> = {}

  for (let i = 0; i < values.length; i += REQUEST_BATCH_SIZE) {
    const batch = values.slice(i, i + REQUEST_BATCH_SIZE)
    try {
      const [translations] = await googleTranslate.translate(batch, targetLang)
      for (let j = 0; j < batch.length; j++) {
        result[keys[i + j]] = Array.isArray(translations) ? translations[j] : translations
      }
    } catch (err) {
      // fallback: just return English if Google fails
      for (let j = 0; j < batch.length; j++) {
        result[keys[i + j]] = batch[j]
      }
    }
  }
  return result
}

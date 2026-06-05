import "server-only"

import Anthropic from "@anthropic-ai/sdk"

/**
 * Best-effort message translation for buyer↔manufacturer chat.
 *
 * Kenyan buyers (English/Swahili) and Chinese manufacturers rarely share a
 * language, so each message is translated once at send time into all three
 * supported locales and cached on the row. Reads are then a plain lookup — we
 * never translate on the hot path and never call the model from a page.
 *
 * Translation is strictly best-effort: with no API key, or on any API/parse
 * failure, we return no translations and the UI falls back to the original
 * text. A failed translation must never block a message from being sent.
 */

export const TRANSLATION_LOCALES = ["en", "sw", "zh"] as const
export type TranslationLocale = (typeof TRANSLATION_LOCALES)[number]

// Haiku 4.5: fast and cheap, which suits short, high-volume chat lines.
const TRANSLATION_MODEL = "claude-haiku-4-5"
const MAX_INPUT_CHARS = 4000

export interface TranslationResult {
  /** Detected source locale, or null when detection/translation failed. */
  sourceLang: TranslationLocale | null
  /**
   * Body keyed by locale, e.g. { en, sw, zh }. The source locale maps to the
   * verbatim original. Empty when translation was unavailable.
   */
  translations: Partial<Record<TranslationLocale, string>>
}

const EMPTY: TranslationResult = { sourceLang: null, translations: {} }

let cachedClient: Anthropic | null = null
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  if (!cachedClient) cachedClient = new Anthropic({ apiKey })
  return cachedClient
}

function isLocale(value: unknown): value is TranslationLocale {
  return (
    typeof value === "string" &&
    (TRANSLATION_LOCALES as readonly string[]).includes(value)
  )
}

/** Pull the first JSON object out of the model's text response. */
function parseJsonObject(text: string): Record<string, unknown> | null {
  const start = text.indexOf("{")
  const end = text.lastIndexOf("}")
  if (start === -1 || end <= start) return null
  try {
    const parsed: unknown = JSON.parse(text.slice(start, end + 1))
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/**
 * Detect the language of `body` and translate it into every supported locale.
 * Never throws — returns an empty result on any failure so callers can persist
 * the message regardless.
 */
export async function translateMessage(
  body: string
): Promise<TranslationResult> {
  const trimmed = body.trim()
  if (!trimmed) return EMPTY

  const anthropic = getClient()
  if (!anthropic) return EMPTY

  const input = trimmed.slice(0, MAX_INPUT_CHARS)

  try {
    const response = await anthropic.messages.create({
      model: TRANSLATION_MODEL,
      max_tokens: 2048,
      system:
        "You are a translation engine for a B2B trade marketplace chat between " +
        "Kenyan buyers and Chinese manufacturers. Detect the language of the " +
        "user's message and translate it into English, Swahili, and Simplified " +
        "Chinese. Preserve meaning, product names, numbers, units, and prices " +
        "exactly. Add no commentary. Respond with ONLY a minified JSON object of " +
        'the form {"source":"en|sw|zh","en":"...","sw":"...","zh":"..."}. If the ' +
        "language is none of these, pick the closest source and still translate.",
      messages: [{ role: "user", content: input }],
    })

    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim()

    const parsed = parseJsonObject(text)
    if (!parsed) return EMPTY

    const sourceLang = isLocale(parsed.source) ? parsed.source : null
    const translations: Partial<Record<TranslationLocale, string>> = {}
    for (const locale of TRANSLATION_LOCALES) {
      const value = parsed[locale]
      if (typeof value === "string" && value.trim()) {
        translations[locale] = value.trim()
      }
    }
    // Keep the sender's exact wording for the source locale — never let the
    // model paraphrase what was actually written.
    if (sourceLang) translations[sourceLang] = trimmed

    if (Object.keys(translations).length === 0) return EMPTY
    return { sourceLang, translations }
  } catch {
    return EMPTY
  }
}

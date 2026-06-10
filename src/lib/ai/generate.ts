import "server-only"

import Anthropic from "@anthropic-ai/sdk"

/**
 * Best-effort single-shot text generation (RFQ drafts, product descriptions).
 * Server-only and strictly optional: with no API key or on any failure it
 * returns null, and callers fall back to manual entry. Never throws.
 */

// Haiku 4.5: fast and inexpensive, suitable for short marketing/spec copy.
const MODEL = "claude-haiku-4-5"
const MAX_INPUT_CHARS = 4000

let cachedClient: Anthropic | null = null
function getClient(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return null
  if (!cachedClient) cachedClient = new Anthropic({ apiKey })
  return cachedClient
}

export async function generateText(opts: {
  system: string
  prompt: string
  maxTokens?: number
}): Promise<string | null> {
  const anthropic = getClient()
  if (!anthropic) return null
  const prompt = opts.prompt.trim().slice(0, MAX_INPUT_CHARS)
  if (!prompt) return null

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: [{ role: "user", content: prompt }],
    })
    const text = response.content
      .map((block) => (block.type === "text" ? block.text : ""))
      .join("")
      .trim()
    return text || null
  } catch {
    return null
  }
}

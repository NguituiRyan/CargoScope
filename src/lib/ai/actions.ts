"use server"

import { generateText } from "@/lib/ai/generate"
import { requireRole, requireUser } from "@/lib/auth/session"

export interface AiTextResult {
  text?: string
  error?: string
}

const UNAVAILABLE = { error: "unavailable" } as const

/** Draft a clear RFQ description for a buyer from a title + optional notes. */
export async function draftRfqDescriptionAction(input: {
  title: string
  notes?: string
}): Promise<AiTextResult> {
  await requireUser()
  const title = (input.title ?? "").trim()
  if (title.length < 3) return { error: "title" }

  const text = await generateText({
    system:
      "You help wholesale buyers write clear B2B sourcing RFQ (request for " +
      "quotation) descriptions for Chinese manufacturers. Given a product title " +
      "and optional notes, write a concise, professional RFQ description of about " +
      "120-180 words covering what the buyer wants, key specifications or " +
      "materials, quality and certification expectations, packaging, and any " +
      "customization. Use clear plain English and a neutral tone. No markdown " +
      "headings, no preamble — return only the description text.",
    prompt: `Title: ${title}\nNotes: ${input.notes?.trim() || "(none)"}`,
    maxTokens: 700,
  })
  return text ? { text } : UNAVAILABLE
}

/** Draft a product description for a supplier from a title + optional fields. */
export async function generateProductDescriptionAction(input: {
  title: string
  category?: string
  specs?: string
}): Promise<AiTextResult> {
  await requireRole("manufacturer")
  const title = (input.title ?? "").trim()
  if (title.length < 3) return { error: "title" }

  const text = await generateText({
    system:
      "You write concise, persuasive B2B product descriptions for a sourcing " +
      "marketplace where Chinese manufacturers sell to African wholesale buyers. " +
      "Given a product title and optional category and specifications, write a " +
      "clear 90-150 word description highlighting materials, key features, typical " +
      "use, and quality. Use plain English and a neutral, professional tone. No " +
      "markdown headings, no preamble — return only the description text.",
    prompt: `Title: ${title}\nCategory: ${input.category?.trim() || "(none)"}\nSpecs: ${input.specs?.trim() || "(none)"}`,
    maxTokens: 600,
  })
  return text ? { text } : UNAVAILABLE
}

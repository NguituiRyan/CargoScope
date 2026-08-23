import "server-only"

export async function passesSpamChecks(formData: FormData): Promise<boolean> {
  if (String(formData.get("website") ?? "").trim()) return false
  const startedAt = Number(formData.get("formStartedAt") ?? 0)
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < 1200) return false

  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true
  const token = String(formData.get("cf-turnstile-response") ?? "")
  if (!token) return false
  try {
    const body = new URLSearchParams({ secret, response: token })
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body, cache: "no-store" }
    )
    const result = (await response.json()) as { success?: boolean }
    return result.success === true
  } catch {
    return false
  }
}

"use server"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { getLocale } from "next-intl/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { localePath, safeNextPath } from "@/lib/auth/session"

export interface AuthState {
  error?: string
  needsConfirmation?: boolean
}

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const signUpSchema = z.object({
  fullName: z.string().trim().min(1, { message: "Enter your name" }).max(120),
  email: z.string().email({ message: "Enter a valid email" }),
  password: z.string().min(8, { message: "Use at least 8 characters" }),
  role: z.enum(["buyer", "manufacturer"]),
})

async function resolveLocale(formData: FormData): Promise<string> {
  const fromForm = formData.get("locale")
  if (typeof fromForm === "string" && fromForm) return fromForm
  return getLocale()
}

/**
 * Absolute origin of the current request (e.g. https://shopbuddy.africa),
 * used to build the email-confirmation redirect. Derived from the request host
 * so it always points at the live domain — not whatever NEXT_PUBLIC_SITE_URL
 * happens to be — with that env var as a last-resort fallback.
 */
async function siteOrigin(): Promise<string> {
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host")
  if (host) {
    const proto =
      h.get("x-forwarded-proto") ??
      (host.startsWith("localhost") || host.startsWith("127.0.0.1")
        ? "http"
        : "https")
    return `${proto}://${host}`
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? ""
}

export async function signInAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  })
  if (!parsed.success) {
    return { error: "Enter a valid email and password." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword(parsed.data)
  if (error) {
    return { error: "Invalid email or password." }
  }

  const next = safeNextPath(formData.get("next") as string | null)
  redirect(next ?? localePath(await resolveLocale(formData), "/account"))
}

export async function signUpAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check your details." }
  }

  const supabase = await createClient()
  const origin = await siteOrigin()
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName, role: parsed.data.role },
      emailRedirectTo: origin ? `${origin}/auth/confirm` : undefined,
    },
  })
  if (error) {
    return { error: error.message }
  }

  // Email confirmation disabled → session is ready; go straight to the next
  // step — suppliers build their company profile, buyers start browsing.
  if (data.session) {
    const loc = await resolveLocale(formData)
    const next = safeNextPath(formData.get("next") as string | null)
    redirect(
      next ??
        localePath(
          loc,
          parsed.data.role === "manufacturer"
            ? "/seller/onboarding?welcome=1"
            : "/products"
        )
    )
  }

  return { needsConfirmation: true }
}

const resetRequestSchema = z.object({ email: z.string().email() })

/**
 * Send a password-reset email. Always reports success so we never reveal
 * whether an account exists. The email links to /auth/confirm (verifyOtp,
 * type=recovery), which sets a recovery session and forwards to /reset-password.
 */
export async function requestPasswordResetAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") })
  if (!parsed.success) {
    return { error: "Enter a valid email address." }
  }

  const supabase = await createClient()
  const origin = await siteOrigin()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: origin ? `${origin}/auth/confirm?next=/reset-password` : undefined,
  })

  return { needsConfirmation: true }
}

const newPasswordSchema = z.string().min(8, { message: "Use at least 8 characters" })

/**
 * Set a new password for the user in the current (recovery) session. Requires
 * the session established by the reset link via /auth/confirm.
 */
export async function updatePasswordAction(
  _prev: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get("password")
  const confirm = formData.get("confirm")
  const parsed = newPasswordSchema.safeParse(password)
  if (!parsed.success) {
    return { error: "Use at least 8 characters." }
  }
  if (password !== confirm) {
    return { error: "Passwords do not match." }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password: parsed.data })
  if (error) {
    return {
      error:
        "Could not update your password — the reset link may have expired. Request a new one.",
    }
  }

  redirect(localePath(await resolveLocale(formData), "/account"))
}

export async function signOutAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(localePath(await resolveLocale(formData), "/"))
}

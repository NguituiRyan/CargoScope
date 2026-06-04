"use server"

import { redirect } from "next/navigation"
import { getLocale } from "next-intl/server"
import { z } from "zod"

import { createClient } from "@/lib/supabase/server"
import { localePath } from "@/lib/auth/session"

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

  redirect(localePath(await resolveLocale(formData), "/account"))
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
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? ""
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

  // Email confirmation disabled → session is ready, go straight in.
  if (data.session) {
    redirect(localePath(await resolveLocale(formData), "/account"))
  }

  return { needsConfirmation: true }
}

export async function signOutAction(formData: FormData): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect(localePath(await resolveLocale(formData), "/"))
}

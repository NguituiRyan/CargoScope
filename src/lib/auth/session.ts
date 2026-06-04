import "server-only"

import { cache } from "react"
import { redirect } from "next/navigation"
import { getLocale } from "next-intl/server"

import { routing } from "@/i18n/routing"
import { createClient } from "@/lib/supabase/server"

export type Role = "buyer" | "manufacturer" | "admin"

export interface SessionUser {
  id: string
  email: string
  role: Role
  fullName: string | null
}

/** Build a locale-aware path honouring the "as-needed" prefix strategy. */
export function localePath(locale: string, href: string): string {
  const base = locale === routing.defaultLocale ? "" : `/${locale}`
  if (href === "/") return base || "/"
  return `${base}${href}`
}

/**
 * Resolve the current authenticated user and their profile role.
 * `cache` dedupes the lookup across a single request (header + page + guard).
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name")
    .eq("id", user.id)
    .maybeSingle()

  return {
    id: user.id,
    email: user.email ?? "",
    role: (profile?.role as Role | undefined) ?? "buyer",
    fullName: (profile?.full_name as string | null) ?? null,
  }
})

/** Require an authenticated user, redirecting to sign-in otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser()
  if (user) return user
  const locale = await getLocale()
  redirect(localePath(locale, "/sign-in"))
}

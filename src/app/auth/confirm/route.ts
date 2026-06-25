import type { EmailOtpType } from "@supabase/supabase-js"
import { type NextRequest, NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

// Supabase emails a confirmation/recovery link here. We establish the session
// (cookies) and redirect onward. Handles both flows: token_hash via verifyOtp
// (the token-hash email template — robust across devices) and a PKCE ?code via
// exchangeCodeForSession (the default template).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const code = searchParams.get("code")
  // Open-redirect guard: only follow internal relative paths — never an
  // absolute (https://evil.com) or protocol-relative (//evil.com) URL.
  const requestedNext = searchParams.get("next") ?? "/account"
  const next =
    requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/account"

  const supabase = await createClient()

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) return NextResponse.redirect(new URL(next, origin))
  } else if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) return NextResponse.redirect(new URL(next, origin))
  }

  return NextResponse.redirect(new URL("/sign-in?error=confirm", origin))
}

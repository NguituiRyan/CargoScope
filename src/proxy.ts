import { createServerClient } from "@supabase/ssr"
import createMiddleware from "next-intl/middleware"
import type { NextRequest } from "next/server"

import { routing } from "./i18n/routing"

const handleI18n = createMiddleware(routing)

export async function proxy(request: NextRequest) {
  // 1) Let next-intl resolve locale (it may rewrite/redirect); reuse its
  //    response as the cookie carrier for the Supabase session refresh.
  const response = handleI18n(request)

  // 2) Refresh the Supabase auth session. Do NOT run logic between
  //    createServerClient and getUser — it must be the next call.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  await supabase.auth.getUser()

  return response
}

export const config = {
  // Match all pathnames except for
  // - API + auth callback routes (/api, /trpc, /auth)
  // - Next.js internals (/_next, /_vercel)
  // - files with an extension (e.g. favicon.ico)
  matcher: ["/((?!api|trpc|auth|_next|_vercel|.*\\..*).*)"],
}

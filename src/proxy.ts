import createMiddleware from "next-intl/middleware"
import type { NextRequest } from "next/server"

import { routing } from "./i18n/routing"

const handleI18n = createMiddleware(routing)

export function proxy(request: NextRequest) {
  return handleI18n(request)
}

export const config = {
  // Match all pathnames except for
  // - API routes (/api, /trpc)
  // - Next.js internals (/_next, /_vercel)
  // - files with an extension (e.g. favicon.ico)
  matcher: ["/((?!api|trpc|_next|_vercel|.*\\..*).*)"],
}

import * as Sentry from "@sentry/nextjs"

// Browser-side Sentry. Disabled (no-op) unless NEXT_PUBLIC_SENTRY_DSN is set, so
// dev/preview stay clean. Pairs with sentry.server/edge configs + instrumentation.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

Sentry.init({
  dsn,
  enabled: Boolean(dsn),
  tracesSampleRate: 1,
  debug: false,
})

// Instruments App Router client-side navigations for tracing.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart

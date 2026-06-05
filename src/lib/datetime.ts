/**
 * Format an ISO timestamp as a locale-aware date (no time). Pinned to UTC so the
 * rendered day matches the stored date regardless of server timezone — safe to
 * call from server components without a hydration mismatch.
 */
export function formatDateOnly(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(iso))
}

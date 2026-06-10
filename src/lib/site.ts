/** Canonical absolute site origin (no trailing slash), for SEO/metadata/sitemap. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://cargo-scope.vercel.app"
).replace(/\/+$/, "")

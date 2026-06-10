import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / authenticated areas — keep out of the index.
      disallow: [
        "/account",
        "/admin",
        "/seller",
        "/messages",
        "/rfqs",
        "/sign-in",
        "/sign-up",
        "/auth/",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}

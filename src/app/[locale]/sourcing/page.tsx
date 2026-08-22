import type { Metadata } from "next"
import { setRequestLocale } from "next-intl/server"
import { BadgeDollarSign, SearchCheck, UsersRound } from "lucide-react"

import { SourcingForm } from "@/components/sourcing/sourcing-form"

export const metadata: Metadata = {
  title: "Shopbuddy Sourcing Request",
  description:
    "Free managed China supplier search with supplier comparison, MOQ comparison, price negotiation and shortlisting.",
  alternates: { canonical: "/sourcing" },
}

export default async function SourcingPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ imageSearch?: string | string[] }>
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams])
  setRequestLocale(locale)
  const raw = Array.isArray(query.imageSearch) ? query.imageSearch[0] : query.imageSearch
  const imageSearchId = raw && /^[0-9a-f-]{36}$/i.test(raw) ? raw : undefined

  return (
    <div className="bg-gradient-to-b from-[#ffd166]/20 via-background to-background">
      <section className="mx-auto w-full max-w-6xl px-4 pb-8 pt-10 sm:pt-14">
        <div className="max-w-3xl">
          <p className="text-sm font-bold tracking-[0.18em] text-primary uppercase">Can&apos;t find the product?</p>
          <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl">Shopbuddy Sourcing Request</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
            Tell us what you need—even if all you have is a photo, video or link. We search China&apos;s supplier market, compare options and negotiate the first price and MOQ conversations for you. The service is free—you only pay your supplier and shipping.
          </p>
        </div>
        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          {[
            [SearchCheck, "Market search", "China-wide supplier research"],
            [UsersRound, "Shortlist", "Suitable suppliers compared"],
            [BadgeDollarSign, "Negotiate", "Initial price and MOQ comparison"],
          ].map(([Icon, title, text]) => {
            const I = Icon as typeof SearchCheck
            return <div key={String(title)} className="flex items-center gap-3 rounded-xl border bg-background/80 p-4"><I className="size-5 shrink-0 text-primary" aria-hidden /><div><p className="text-sm font-semibold">{String(title)}</p><p className="text-xs text-muted-foreground">{String(text)}</p></div></div>
          })}
        </div>
      </section>
      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <SourcingForm imageSearchId={imageSearchId} />
      </section>
    </div>
  )
}

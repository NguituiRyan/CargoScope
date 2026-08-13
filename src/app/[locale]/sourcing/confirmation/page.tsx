import type { Metadata } from "next"
import { CheckCircle2, Mail, MessageCircle } from "lucide-react"

import { ConversionEvent } from "@/components/analytics/conversion-event"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Sourcing request confirmation",
  robots: { index: false, follow: false },
}

const SOURCING_EMAIL = "shopbuddyafrica@gmail.com"
const WHATSAPP_NUMBER = "8619550539767"

export default async function SourcingConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const rawReference = Array.isArray(sp.reference) ? sp.reference[0] : sp.reference
  const reference =
    rawReference && /^SB-SRC-\d{8}-[A-Z0-9]+$/.test(rawReference)
      ? rawReference
      : "your ShopBuddy sourcing request"
  const subject = encodeURIComponent(`ShopBuddy sourcing request ${reference}`)
  const message = encodeURIComponent(
    `Hello ShopBuddy, I submitted sourcing request ${reference}. Please contact me with the next steps.`
  )

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-16">
      <div className="w-full rounded-2xl border bg-card p-7 text-center shadow-lg sm:p-10">
        <ConversionEvent event="sourcing_request_submitted" />
        <CheckCircle2
          className="mx-auto size-14 text-verified-foreground"
          aria-hidden
        />
        <h1 className="mt-5 font-heading text-3xl font-bold">
          Sourcing request received
        </h1>
        <p className="mt-3 text-muted-foreground">
          Thank you. Our sourcing team will review your requirements and contact
          you by WhatsApp or email with the next steps.
        </p>
        <div className="mt-5 rounded-xl bg-muted p-4">
          <p className="text-xs font-medium text-muted-foreground uppercase">
            Request / RFQ reference
          </p>
          <p className="mt-1 font-mono text-lg font-bold">{reference}</p>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Keep this reference for follow-up. You can also contact the sourcing
          desk directly using either option below.
        </p>
        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`}
            target="_blank"
            rel="noreferrer"
            className={cn(buttonVariants({ size: "lg" }))}
          >
            <MessageCircle aria-hidden /> WhatsApp ShopBuddy
          </a>
          <a
            href={`mailto:${SOURCING_EMAIL}?subject=${subject}&body=${message}`}
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            <Mail aria-hidden /> Email ShopBuddy
          </a>
        </div>
        <Link
          href="/products"
          className="mt-6 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Continue browsing products
        </Link>
      </div>
    </div>
  )
}

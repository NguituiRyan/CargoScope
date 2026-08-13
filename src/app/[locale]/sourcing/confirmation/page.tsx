import type { Metadata } from "next"
import { CheckCircle2, Clock3, XCircle } from "lucide-react"

import { ConversionEvent } from "@/components/analytics/conversion-event"
import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { fulfillSourcingPayment } from "@/lib/sourcing/fulfillment"
import { cn } from "@/lib/utils"

export const metadata: Metadata = { title: "Sourcing payment confirmation", robots: { index: false, follow: false } }

export default async function SourcingConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const value = (key: string) => Array.isArray(sp[key]) ? sp[key]?.[0] : sp[key]
  const transactionId = value("transaction_id")
  const txRef = value("tx_ref")
  const gatewayStatus = value("status")
  const result =
    gatewayStatus === "successful" && transactionId
      ? await fulfillSourcingPayment(transactionId, txRef)
      : { ok: false, error: gatewayStatus === "cancelled" ? "Payment was cancelled." : "Payment was not completed." }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-16">
      <div className="w-full rounded-2xl border bg-card p-7 text-center shadow-lg sm:p-10">
        {result.ok ? <CheckCircle2 className="mx-auto size-14 text-verified-foreground" aria-hidden /> : gatewayStatus === "pending" ? <Clock3 className="mx-auto size-14 text-primary" aria-hidden /> : <XCircle className="mx-auto size-14 text-destructive" aria-hidden />}
        <h1 className="mt-5 font-heading text-3xl font-bold">{result.ok ? "Sourcing activated" : "Sourcing not activated"}</h1>
        {result.ok ? (
          <>
            <ConversionEvent event="sourcing_payment_success" metadata={{ amount: 100, currency: "USD" }} />
            <p className="mt-3 text-muted-foreground">Your US$100 payment is confirmed. Your request is now in the paid queue and our sourcing team has been notified.</p>
            <div className="mt-5 rounded-xl bg-muted p-4"><p className="text-xs font-medium text-muted-foreground uppercase">Request / RFQ reference</p><p className="mt-1 font-mono text-lg font-bold">{result.reference}</p></div>
            <p className="mt-4 text-sm text-muted-foreground">A confirmation email has been sent. Keep the reference above for WhatsApp and email follow-up.</p>
          </>
        ) : <p className="mt-3 text-muted-foreground">{result.error} Your request will remain Payment Pending and sourcing will not begin until payment succeeds.</p>}
        <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
          {!result.ok ? <Link href="/sourcing" className={cn(buttonVariants({ size: "lg" }))}>Try again</Link> : null}
          <Link href="/products" className={cn(buttonVariants({ variant: result.ok ? "default" : "outline", size: "lg" }))}>Browse products</Link>
        </div>
      </div>
    </div>
  )
}

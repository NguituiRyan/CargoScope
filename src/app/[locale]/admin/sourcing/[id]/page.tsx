import Image from "next/image"
import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"

import { SourcingStatusForm } from "@/components/sourcing/status-form"
import { Badge } from "@/components/ui/badge"
import { getSourcingRequest } from "@/lib/sourcing/admin"

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b py-3 sm:grid-cols-[11rem_1fr]">
      <dt className="text-sm font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value || "—"}</dd>
    </div>
  )
}

export default async function AdminSourcingDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const request = await getSourcingRequest(id)
  if (!request) notFound()

  const activation =
    request.paymentProvider === "manual_follow_up"
      ? `Follow-up required (US$${request.activationFee})`
      : `US$${request.activationFee} via ${request.paymentProvider}${
          request.paymentTransactionId ? ` — ${request.paymentTransactionId}` : ""
        }`

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-mono text-2xl font-bold">{request.reference}</h1>
          <Badge>{request.status.replaceAll("_", " ")}</Badge>
          <Badge variant={request.paymentStatus === "successful" ? "verified" : "outline"}>
            {request.paymentStatus.replaceAll("_", " ")}
          </Badge>
        </div>
        <dl className="mt-6 rounded-xl border bg-card px-5">
          <Row label="Product" value={request.productName} />
          <Row
            label="Product link"
            value={
              request.productLink ? (
                <a href={request.productLink} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  Open product link
                </a>
              ) : null
            }
          />
          <Row label="Quantity / MOQ" value={`${request.quantity.toLocaleString()} ${request.unit}`} />
          <Row label="Quality" value={request.qualityPreference} />
          <Row label="Target budget" value={request.targetBudget ? `${request.targetBudgetCurrency} ${request.targetBudget}` : null} />
          <Row label="Destination" value={[request.destinationCountry, request.destinationCity, request.destinationPort].filter(Boolean).join(" / ")} />
          <Row label="Private label" value={request.privateLabeling ? `Yes${request.brandName ? ` — ${request.brandName}` : ""}` : "No"} />
          <Row label="Requirements" value={<span className="whitespace-pre-wrap">{request.specialRequirements || "—"}</span>} />
          <Row label="Client" value={`${request.clientName}${request.businessName ? ` — ${request.businessName}` : ""}`} />
          <Row
            label="WhatsApp"
            value={<a href={`https://wa.me/${request.whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noreferrer" className="text-primary hover:underline">{request.whatsapp}</a>}
          />
          <Row label="Email" value={<a href={`mailto:${request.email}`} className="text-primary hover:underline">{request.email}</a>} />
          <Row label="Activation" value={activation} />
          <Row label="Created" value={request.createdAt.toLocaleString()} />
        </dl>
        {request.signedAttachments.length ? (
          <div className="mt-6 rounded-xl border bg-card p-5">
            <h2 className="font-heading text-lg font-semibold">Attachments</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {request.signedAttachments.map((item) =>
                item.url ? (
                  item.contentType.startsWith("image/") ? (
                    <a key={item.path} href={item.url} target="_blank" rel="noreferrer" className="relative aspect-video overflow-hidden rounded-xl border">
                      <Image src={item.url} alt={item.name} fill sizes="(max-width: 640px) 100vw, 50vw" className="object-cover" />
                    </a>
                  ) : (
                    <a key={item.path} href={item.url} target="_blank" rel="noreferrer" className="rounded-xl border p-4 text-sm font-medium text-primary">
                      Open video: {item.name}
                    </a>
                  )
                ) : null
              )}
            </div>
          </div>
        ) : null}
      </div>
      <aside>
        <SourcingStatusForm id={request.id} status={request.status} />
      </aside>
    </div>
  )
}

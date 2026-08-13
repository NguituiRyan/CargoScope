import { setRequestLocale } from "next-intl/server"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/i18n/navigation"
import { listSourcingRequests } from "@/lib/sourcing/admin"

export default async function AdminSourcingPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const requests = await listSourcingRequests()
  return (
    <div className="flex flex-col gap-6"><div><p className="text-sm font-bold text-primary uppercase">Lead & request management</p><h1 className="font-heading text-3xl font-bold">Sourcing requests</h1><p className="mt-1 text-sm text-muted-foreground">Customer RFQs from New through Completed.</p></div>
      <div className="overflow-x-auto rounded-xl border bg-card"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">RFQ</th><th className="px-4 py-3">Client</th><th className="px-4 py-3">Product</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Created</th></tr></thead><tbody>
        {requests.map((request) => <tr key={request.id} className="border-b last:border-0 hover:bg-muted/30"><td className="px-4 py-3"><Link href={`/admin/sourcing/${request.id}`} className="font-mono text-xs font-bold text-primary hover:underline">{request.reference}</Link></td><td className="px-4 py-3">{request.clientName}<div className="text-xs text-muted-foreground">{request.businessName || request.email}</div></td><td className="max-w-60 px-4 py-3"><p className="truncate font-medium">{request.productName}</p><p className="text-xs text-muted-foreground">Qty {request.quantity.toLocaleString()}</p></td><td className="px-4 py-3"><Badge variant={request.status === "completed" ? "verified" : request.status === "payment_pending" ? "muted" : "default"}>{request.status.replaceAll("_", " ")}</Badge></td><td className="px-4 py-3"><Badge variant={request.paymentStatus === "successful" ? "verified" : "outline"}>{request.paymentStatus}</Badge></td><td className="px-4 py-3 text-muted-foreground">{request.createdAt.toLocaleDateString()}</td></tr>)}
      </tbody></table>{!requests.length ? <p className="p-8 text-center text-muted-foreground">No sourcing requests yet.</p> : null}</div>
    </div>
  )
}

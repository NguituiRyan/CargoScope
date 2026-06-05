import { cn } from "@/lib/utils"

const RFQ_STYLES: Record<string, string> = {
  open: "bg-verified/15 text-verified-foreground",
  quoting: "bg-primary/10 text-primary",
  closed: "bg-muted text-muted-foreground",
}

const QUOTE_STYLES: Record<string, string> = {
  submitted: "bg-primary/10 text-primary",
  accepted: "bg-verified/15 text-verified-foreground",
  declined: "bg-muted text-muted-foreground",
}

function Pill({ className, label }: { className: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs font-medium",
        className
      )}
    >
      {label}
    </span>
  )
}

export function RfqStatusBadge({
  status,
  label,
}: {
  status: "open" | "quoting" | "closed"
  label: string
}) {
  return <Pill className={RFQ_STYLES[status] ?? RFQ_STYLES.closed} label={label} />
}

export function QuoteStatusBadge({
  status,
  label,
}: {
  status: "submitted" | "accepted" | "declined"
  label: string
}) {
  return (
    <Pill className={QUOTE_STYLES[status] ?? QUOTE_STYLES.submitted} label={label} />
  )
}

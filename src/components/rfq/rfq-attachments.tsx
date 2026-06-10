import { FileText, Paperclip } from "lucide-react"
import { getTranslations } from "next-intl/server"

import { signRfqAttachments, type RfqAttachment } from "@/lib/rfq/attachments"

/** Renders an RFQ's attachments as downloadable chips (short-lived signed URLs). */
export async function RfqAttachments({
  attachments,
}: {
  attachments: RfqAttachment[]
}) {
  if (attachments.length === 0) return null
  const t = await getTranslations("rfq")
  const signed = await signRfqAttachments(attachments)

  return (
    <div className="flex flex-col gap-2">
      <h3 className="inline-flex items-center gap-1.5 text-sm font-medium">
        <Paperclip className="size-4 text-muted-foreground" aria-hidden />
        {t("attachmentsTitle")}
      </h3>
      <ul className="flex flex-wrap gap-2">
        {signed.map((a, i) =>
          a.url ? (
            <li key={i}>
              <a
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-muted"
              >
                <FileText className="size-4 text-muted-foreground" aria-hidden />
                <span className="max-w-[14rem] truncate">{a.name}</span>
              </a>
            </li>
          ) : (
            <li
              key={i}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground"
            >
              <FileText className="size-4" aria-hidden />
              <span className="max-w-[14rem] truncate">{a.name}</span>
            </li>
          )
        )}
      </ul>
    </div>
  )
}

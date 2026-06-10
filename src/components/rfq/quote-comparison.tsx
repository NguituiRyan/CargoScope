import { getTranslations } from "next-intl/server"

import { VerificationBadge } from "@/components/manufacturers/verification-badge"
import { AcceptQuoteButton } from "@/components/rfq/accept-quote-button"
import { formatMoney } from "@/lib/currency/shared"
import { formatDateOnly } from "@/lib/datetime"
import type { BuyerRfqDetail } from "@/lib/rfq/queries"
import { cn } from "@/lib/utils"

/**
 * Side-by-side comparison of the quotes on a buyer's RFQ — one column per
 * supplier, key metrics as rows, cheapest unit price flagged. Lets the buyer
 * scan and accept without scrolling through individual cards.
 */
export async function QuoteComparison({
  quotes,
  rfqId,
  unit,
  closed,
  locale,
}: {
  quotes: BuyerRfqDetail["quotes"]
  rfqId: string
  unit: string
  closed: boolean
  locale: string
}) {
  const t = await getTranslations("rfq")
  const minPrice = Math.min(...quotes.map((q) => Number(q.unitPrice)))

  const cell = "p-3 align-top"
  const label = "p-3 align-top text-muted-foreground"

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left">
            <th className={cn(label, "font-medium")}>{t("compareMetric")}</th>
            {quotes.map((q) => (
              <th key={q.id} className={cn(cell, "font-semibold")}>
                <div className="flex flex-col gap-1">
                  <span>{q.manufacturerName ?? t("buyer")}</span>
                  <VerificationBadge status={q.manufacturerStatus} />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          <tr>
            <td className={label}>{t("unitPrice")}</td>
            {quotes.map((q) => {
              const cheapest = Number(q.unitPrice) === minPrice
              return (
                <td
                  key={q.id}
                  className={cn(
                    cell,
                    "font-semibold",
                    cheapest && "text-verified-foreground"
                  )}
                >
                  {formatMoney(q.unitPrice, q.currency)}
                  {cheapest ? (
                    <span className="ml-1 text-xs font-medium">
                      · {t("compareBest")}
                    </span>
                  ) : null}
                </td>
              )
            })}
          </tr>
          <tr>
            <td className={label}>{t("moq")}</td>
            {quotes.map((q) => (
              <td key={q.id} className={cell}>
                {q.moq !== null ? `${q.moq} ${unit}` : "—"}
              </td>
            ))}
          </tr>
          <tr>
            <td className={label}>{t("leadTime")}</td>
            {quotes.map((q) => (
              <td key={q.id} className={cell}>
                {q.leadTimeDays !== null
                  ? t("leadDays", { days: q.leadTimeDays })
                  : "—"}
              </td>
            ))}
          </tr>
          <tr>
            <td className={label}>{t("incoterm")}</td>
            {quotes.map((q) => (
              <td key={q.id} className={cell}>
                {q.incoterm ?? "—"}
              </td>
            ))}
          </tr>
          <tr>
            <td className={label}>{t("validUntil")}</td>
            {quotes.map((q) => (
              <td key={q.id} className={cell}>
                {q.validUntil ? formatDateOnly(q.validUntil, locale) : "—"}
              </td>
            ))}
          </tr>
          {!closed ? (
            <tr>
              <td className={label} />
              {quotes.map((q) => (
                <td key={q.id} className={cell}>
                  {q.status === "accepted" ? (
                    <span className="text-xs font-medium text-verified-foreground">
                      {t("acceptedNote")}
                    </span>
                  ) : (
                    <AcceptQuoteButton
                      rfqId={rfqId}
                      quoteId={q.id}
                      label={t("accept")}
                    />
                  )}
                </td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

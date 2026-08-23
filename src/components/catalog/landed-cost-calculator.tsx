"use client"

import { useMemo, useState } from "react"
import { Send } from "lucide-react"
import { useTranslations } from "next-intl"

import { startConversationAction } from "@/lib/messaging/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AIR_CONSOLIDATED_USD_PER_KG,
  packagingPerUnit,
  SEA_CONSOLIDATED_KES_PER_CBM,
  type ShippingChannel,
  type ShippingMode,
  unitPriceForQuantity,
  VOLUMETRIC_KG_PER_CBM,
} from "@/lib/landed-cost/calculate"
import { formatMoney } from "@/lib/format"

type Tier = { minQty: number; unitPriceUsd: number }

type Props = {
  tiers: Tier[]
  unit: string
  moq: number | null
  manufacturerId: string
  productId: string
  productTitle: string
  /** Supplier-declared packaging per unit; estimated via courier norms when null. */
  unitWeightKg: number | null
  unitVolumeCbm: number | null
  fx: { rate: number; datedAt: string; source: "live" | "fallback" }
}

/**
 * Shipping estimate + inquiry, per the freight partner's model. Consolidated
 * (the default) shows one flat all-in rate; declared options list what a
 * customs entry involves and route the buyer to inquiry — the Alibaba pattern
 * of settling exact shipping with the supplier rather than pre-computing it.
 */
export function LandedCostCalculator({
  tiers,
  unit,
  moq,
  manufacturerId,
  productId,
  productTitle,
  unitWeightKg,
  unitVolumeCbm,
  fx,
}: Props) {
  const t = useTranslations("landedCost")

  const initialQty = useMemo(() => {
    if (moq && moq > 0) return moq
    const lowest = tiers.reduce(
      (min, tier) => (tier.minQty < min ? tier.minQty : min),
      tiers[0]?.minQty ?? 1
    )
    return lowest > 0 ? lowest : 1
  }, [moq, tiers])

  const [qtyStr, setQtyStr] = useState(String(initialQty))
  const [mode, setMode] = useState<ShippingMode>("sea")
  const [channel, setChannel] = useState<ShippingChannel>("consolidated")
  const [container, setContainer] = useState<"lcl" | "fcl">("lcl")

  const qty = Math.max(0, Math.floor(Number(qtyStr) || 0))

  // Packaging comes from the supplier (or courier-standard estimates) — never
  // entered by the buyer. Air charges the greater of actual vs volumetric kg.
  const pack = packagingPerUnit(unitWeightKg, unitVolumeCbm)
  const chargeableKgPerUnit = Math.max(
    pack.weightKg,
    pack.volumeCbm * VOLUMETRIC_KG_PER_CBM
  )

  const unitPriceUsd = unitPriceForQuantity(tiers, qty)
  const goodsKes = Math.round(unitPriceUsd * qty * fx.rate)
  const shippingKes =
    mode === "air"
      ? Math.round(
          qty * chargeableKgPerUnit * AIR_CONSOLIDATED_USD_PER_KG * fx.rate
        )
      : Math.round(qty * pack.volumeCbm * SEA_CONSOLIDATED_KES_PER_CBM)
  const totalKes = goodsKes + shippingKes
  const perUnitKes = qty > 0 ? Math.round(totalKes / qty) : 0

  const consolidated = channel === "consolidated"
  const fxDate = fx.datedAt.slice(0, 10)

  const channelText = consolidated
    ? mode === "air"
      ? "Air — consolidated (all-in)"
      : "Sea — consolidated (all-in)"
    : mode === "air"
      ? "Air — declared (full customs entry)"
      : `Sea — declared, ${container.toUpperCase()} (full customs entry)`
  const draft = [
    `Inquiry: ${productTitle}`,
    `Quantity: ${qty} ${unit}`,
    `Preferred shipping: ${channelText}`,
    "",
    "Hello, please confirm your best unit price, packaging weight/volume per unit, and lead time for this order.",
  ].join("\n")

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>{t("shippingMode")}</Label>
          <div className="flex gap-2">
            {(["sea", "air"] as const).map((m) => (
              <Button
                key={m}
                type="button"
                size="sm"
                variant={mode === m ? "default" : "outline"}
                aria-pressed={mode === m}
                onClick={() => setMode(m)}
              >
                {t(m)}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>{t("channel")}</Label>
          <div className="flex flex-wrap gap-2">
            {(["consolidated", "declared"] as const).map((c) => (
              <Button
                key={c}
                type="button"
                size="sm"
                variant={channel === c ? "default" : "outline"}
                aria-pressed={channel === c}
                onClick={() => setChannel(c)}
              >
                {t(c)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lc-qty">{t("quantity")}</Label>
          <Input
            id="lc-qty"
            type="number"
            min={1}
            step={1}
            inputMode="numeric"
            value={qtyStr}
            onChange={(e) => setQtyStr(e.target.value)}
          />
        </div>
        {!consolidated && mode === "sea" ? (
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label>{t("containerType")}</Label>
            <div className="flex flex-wrap gap-2">
              {(["lcl", "fcl"] as const).map((c) => (
                <Button
                  key={c}
                  type="button"
                  size="sm"
                  variant={container === c ? "default" : "outline"}
                  aria-pressed={container === c}
                  onClick={() => setContainer(c)}
                >
                  {t(c)}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {consolidated ? (
        qty < 1 ? (
          <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
            {t("enterQuantity")}
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              {mode === "air" ? t("consolidatedAirNote") : t("consolidatedSeaNote")}
            </p>
            <dl className="flex flex-col divide-y divide-border text-sm">
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{t("rowGoods")}</dt>
                <dd className="text-right font-medium tabular-nums">
                  {formatMoney(goodsKes, "KES")}
                </dd>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">
                  {t("rowFreight", { mode: t(mode) })}
                </dt>
                <dd className="text-right font-medium tabular-nums">
                  {formatMoney(shippingKes, "KES")}
                </dd>
              </div>
            </dl>
            <div className="flex flex-col gap-1 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <span className="text-xs font-medium text-muted-foreground">
                {t("totalLabel")}
              </span>
              <span className="font-heading text-2xl font-semibold tabular-nums text-primary">
                {formatMoney(totalKes, "KES")}
              </span>
              <span className="text-xs text-muted-foreground">
                {t("perUnit", { price: formatMoney(perUnitKes, "KES"), unit })}
              </span>
            </div>
          </>
        )
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          {mode === "air" ? t("declaredAirNote") : t("declaredSeaNote")}
        </p>
      )}

      <form action={startConversationAction} className="flex flex-col gap-2">
        <input type="hidden" name="manufacturerId" value={manufacturerId} />
        <input type="hidden" name="productId" value={productId} />
        <input type="hidden" name="draft" value={draft} />
        <Button type="submit" size="lg">
          <Send className="size-4" aria-hidden />
          {t("inquireCta")}
        </Button>
        <p className="text-xs text-muted-foreground">{t("indicativeNote")}</p>
      </form>

      <div className="flex flex-col gap-2 text-xs text-muted-foreground">
        {consolidated ? (
          <div className="flex flex-wrap items-center gap-2">
            <span>
              {t("fxLine", { rate: fx.rate.toFixed(2) })} · {t("fxDated", { date: fxDate })}
            </span>
            {fx.source === "fallback" && (
              <Badge variant="outline">{t("estimatedRate")}</Badge>
            )}
          </div>
        ) : null}
        <p>{t("kesNote")}</p>
      </div>
    </div>
  )
}

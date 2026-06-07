"use client"

import { useMemo, useState } from "react"
import { useTranslations } from "next-intl"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DEFAULT_UNIT_VOLUME_CBM,
  DEFAULT_UNIT_WEIGHT_KG,
  type ShippingMode,
  calculateLandedCost,
  unitPriceForQuantity,
} from "@/lib/landed-cost/calculate"
import { formatMoney } from "@/lib/format"

type Tier = { minQty: number; unitPriceUsd: number }

type Props = {
  tiers: Tier[]
  unit: string
  moq: number | null
  hsCode: string | null
  fx: { rate: number; datedAt: string; source: "live" | "fallback" }
}

export function LandedCostCalculator({ tiers, unit, moq, hsCode, fx }: Props) {
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
  const [weightStr, setWeightStr] = useState(String(DEFAULT_UNIT_WEIGHT_KG))
  const [volumeStr, setVolumeStr] = useState(String(DEFAULT_UNIT_VOLUME_CBM))
  const [mode, setMode] = useState<ShippingMode>("sea")

  const qty = Math.max(0, Math.floor(Number(qtyStr) || 0))
  const weightKg = Math.max(0, Number(weightStr) || 0)
  const volumeCbm = Math.max(0, Number(volumeStr) || 0)

  const breakdown = useMemo(() => {
    const unitPriceUsd = unitPriceForQuantity(tiers, qty)
    return calculateLandedCost(
      {
        unitPriceUsd,
        quantity: qty,
        unitWeightKg: weightKg,
        unitVolumeCbm: volumeCbm,
        shippingMode: mode,
        hsCode,
      },
      fx.rate
    )
  }, [tiers, qty, weightKg, volumeCbm, mode, hsCode, fx.rate])

  const toKes = (usd: number) => formatMoney(Math.round(usd * fx.rate), "KES")
  const dutyPercent = Math.round(breakdown.dutyRate * 100)
  const fxDate = fx.datedAt.slice(0, 10)

  const rows = [
    { key: "rowGoods", label: t("rowGoods"), value: toKes(breakdown.goodsUsd) },
    {
      key: "rowFreight",
      label: t("rowFreight", { mode: t(mode) }),
      value: toKes(breakdown.freightUsd),
    },
    {
      key: "rowDuty",
      label: t("rowDuty", { rate: dutyPercent }),
      value: toKes(breakdown.dutyUsd),
    },
    { key: "rowVat", label: t("rowVat"), value: toKes(breakdown.vatUsd) },
    { key: "rowPvoc", label: t("rowPvoc"), value: toKes(breakdown.pvocUsd) },
    {
      key: "rowClearing",
      label: t("rowClearing"),
      value: toKes(breakdown.clearingUsd),
    },
  ]

  return (
    <div className="flex flex-col gap-4">
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
        {mode === "air" ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lc-weight">{t("unitWeight")}</Label>
            <Input
              id="lc-weight"
              type="number"
              min={0}
              step={0.1}
              inputMode="decimal"
              value={weightStr}
              onChange={(e) => setWeightStr(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("weightHint")}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lc-volume">{t("unitVolume")}</Label>
            <Input
              id="lc-volume"
              type="number"
              min={0}
              step={0.001}
              inputMode="decimal"
              value={volumeStr}
              onChange={(e) => setVolumeStr(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{t("volumeHint")}</p>
          </div>
        )}
      </div>

      {qty < 1 ? (
        <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
          {t("enterQuantity")}
        </p>
      ) : (
        <>
          <dl className="flex flex-col divide-y divide-border text-sm">
            {rows.map((row) => (
              <div key={row.key} className="flex justify-between gap-4 py-2">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="text-right font-medium tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>

          <div className="flex flex-col gap-1 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <span className="text-xs font-medium text-muted-foreground">
              {t("totalLabel")}
            </span>
            <span className="font-heading text-2xl font-semibold tabular-nums text-primary">
              {formatMoney(Math.round(breakdown.totalKes), "KES")}
            </span>
            <span className="text-xs text-muted-foreground">
              {t("perUnit", {
                price: formatMoney(Math.round(breakdown.perUnitKes), "KES"),
                unit,
              })}
            </span>
          </div>
        </>
      )}

      <div className="flex flex-col gap-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            {t("fxLine", { rate: fx.rate.toFixed(2) })} · {t("fxDated", { date: fxDate })}
          </span>
          {fx.source === "fallback" && (
            <Badge variant="outline">{t("estimatedRate")}</Badge>
          )}
        </div>
        <p>{t("disclaimer")}</p>
      </div>
    </div>
  )
}

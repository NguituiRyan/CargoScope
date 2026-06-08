"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"

import { Label } from "@/components/ui/label"
import {
  currencyLabel,
  formatMoney,
  type DisplayCurrency,
} from "@/lib/currency/shared"

/**
 * Dual-thumb price slider. Both thumbs share one track; the two overlaid range
 * inputs are pointer-transparent except on their thumbs (see `.range-thumb` in
 * globals.css), so each handle stays grabbable. Hidden `minPrice`/`maxPrice`
 * inputs feed the surrounding filter form — empty at the extremes so no
 * redundant query params are added.
 */
export function PriceRange({
  priceMax,
  priceStep,
  currency,
  defaultMin,
  defaultMax,
}: {
  priceMax: number
  priceStep: number
  currency: DisplayCurrency
  defaultMin?: number
  defaultMax?: number
}) {
  const t = useTranslations("catalog")
  const ccy = currencyLabel(currency)

  const [lo, setLo] = useState(
    defaultMin != null && defaultMin > 0 ? Math.min(defaultMin, priceMax) : 0
  )
  const [hi, setHi] = useState(
    defaultMax != null && defaultMax < priceMax ? Math.max(defaultMax, 0) : priceMax
  )

  const pct = (v: number) => (priceMax > 0 ? (v / priceMax) * 100 : 0)
  const minField = lo > 0 ? String(Math.round(lo)) : ""
  const maxField = hi < priceMax ? String(Math.round(hi)) : ""

  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{t("priceRange", { currency: ccy })}</Label>
        <span className="text-sm font-medium tabular-nums">
          {formatMoney(lo, currency)} –{" "}
          {hi >= priceMax
            ? `${formatMoney(priceMax, currency)}+`
            : formatMoney(hi, currency)}
        </span>
      </div>

      <div className="relative h-9 select-none">
        <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-muted" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary"
          style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
        />
        <input
          type="range"
          min={0}
          max={priceMax}
          step={priceStep}
          value={lo}
          onChange={(e) => setLo(Math.min(Number(e.target.value), hi))}
          aria-label={t("minPrice", { currency: ccy })}
          className="range-thumb absolute inset-x-0 top-1/2 z-20 h-5 w-full -translate-y-1/2 bg-transparent"
        />
        <input
          type="range"
          min={0}
          max={priceMax}
          step={priceStep}
          value={hi}
          onChange={(e) => setHi(Math.max(Number(e.target.value), lo))}
          aria-label={t("maxPrice", { currency: ccy })}
          className="range-thumb absolute inset-x-0 top-1/2 z-10 h-5 w-full -translate-y-1/2 bg-transparent"
        />
      </div>

      <input type="hidden" name="minPrice" value={minField} />
      <input type="hidden" name="maxPrice" value={maxField} />
    </div>
  )
}

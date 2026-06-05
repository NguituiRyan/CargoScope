import "server-only"

import { cookies } from "next/headers"

import {
  DEFAULT_CURRENCY,
  isDisplayCurrency,
  CURRENCY_COOKIE,
  type DisplayCurrency,
} from "@/lib/currency/shared"

/** The buyer's chosen display currency from their cookie, defaulting to KES. */
export async function getDisplayCurrency(): Promise<DisplayCurrency> {
  const store = await cookies()
  const value = store.get(CURRENCY_COOKIE)?.value
  return isDisplayCurrency(value) ? value : DEFAULT_CURRENCY
}

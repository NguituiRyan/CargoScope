export function publicReference(prefix: "SRC" | "IMG"): string {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "")
  const random = crypto.randomUUID().replaceAll("-", "").slice(0, 7).toUpperCase()
  return `SB-${prefix}-${date}-${random}`
}

export function paymentReference(): string {
  return `SBPAY-${crypto.randomUUID()}`
}

import "server-only"

const API = "https://api.flutterwave.com/v3"

interface HostedPaymentInput {
  txRef: string
  email: string
  name: string
  phone: string
  requestReference: string
}

export interface VerifiedFlutterwaveTransaction {
  id: number
  tx_ref: string
  amount: number
  currency: string
  status: string
  payment_type?: string
}

export async function createSourcingHostedPayment(
  input: HostedPaymentInput
): Promise<string> {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY
  if (!secret) throw new Error("Online sourcing payments are not configured yet.")
  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  const response = await fetch(`${API}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: "100.00",
      currency: "USD",
      redirect_url: `${site.replace(/\/$/, "")}/sourcing/confirmation`,
      payment_options: "card,mpesa",
      customer: {
        email: input.email,
        name: input.name,
        phonenumber: input.phone,
      },
      customizations: {
        title: "ShopBuddy Sourcing Activation",
        description: `US$100 sourcing activation — ${input.requestReference}`,
      },
      meta: {
        sourcing_reference: input.requestReference,
        purpose: "sourcing_activation",
      },
      configurations: { session_duration: 30, max_retry_attempt: 5 },
    }),
    cache: "no-store",
  })
  const payload = (await response.json()) as {
    status?: string
    message?: string
    data?: { link?: string }
  }
  if (!response.ok || payload.status !== "success" || !payload.data?.link) {
    throw new Error(payload.message || "Could not start payment.")
  }
  return payload.data.link
}

export async function verifyFlutterwaveTransaction(
  transactionId: string | number
): Promise<VerifiedFlutterwaveTransaction | null> {
  const secret = process.env.FLUTTERWAVE_SECRET_KEY
  if (!secret) return null
  const response = await fetch(`${API}/transactions/${transactionId}/verify`, {
    headers: { Authorization: `Bearer ${secret}` },
    cache: "no-store",
  })
  if (!response.ok) return null
  const payload = (await response.json()) as {
    status?: string
    data?: VerifiedFlutterwaveTransaction
  }
  return payload.status === "success" ? (payload.data ?? null) : null
}

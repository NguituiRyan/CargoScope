import "server-only"

import { sendSourcingActivationConfirmation } from "@/lib/email"
import { verifyFlutterwaveTransaction } from "@/lib/flutterwave"
import { createAdminClient } from "@/lib/supabase/admin"

export interface FulfillmentResult {
  ok: boolean
  reference?: string
  alreadyPaid?: boolean
  error?: string
}

export async function fulfillSourcingPayment(
  transactionId: string | number,
  expectedTxRef?: string
): Promise<FulfillmentResult> {
  const transaction = await verifyFlutterwaveTransaction(transactionId)
  if (!transaction) return { ok: false, error: "Payment could not be verified." }
  if (
    transaction.status !== "successful" ||
    transaction.currency !== "USD" ||
    Number(transaction.amount) < 100 ||
    (expectedTxRef && transaction.tx_ref !== expectedTxRef)
  ) {
    return { ok: false, error: "Payment details did not match the activation fee." }
  }

  const admin = createAdminClient()
  const { data: request } = await admin
    .from("sourcing_requests")
    .select(
      "id, reference, payment_status, product_name, quantity, quality_preference, destination_country, destination_city, destination_port, client_name, business_name, whatsapp, email"
    )
    .eq("payment_reference", transaction.tx_ref)
    .maybeSingle()
  if (!request) return { ok: false, error: "Sourcing request was not found." }
  if (request.payment_status === "successful") {
    return { ok: true, reference: request.reference, alreadyPaid: true }
  }

  const now = new Date().toISOString()
  const { data: updated, error } = await admin
    .from("sourcing_requests")
    .update({
      status: "paid",
      payment_status: "successful",
      payment_transaction_id: String(transaction.id),
      paid_at: now,
      activated_at: now,
      updated_at: now,
    })
    .eq("id", request.id)
    .neq("payment_status", "successful")
    .select("id")
    .maybeSingle()
  if (error) return { ok: false, error: "Payment was verified but activation failed." }
  if (!updated) return { ok: true, reference: request.reference, alreadyPaid: true }

  const destination = [
    request.destination_country,
    request.destination_city,
    request.destination_port,
  ]
    .filter(Boolean)
    .join(" / ")
  await sendSourcingActivationConfirmation({
    reference: request.reference,
    productName: request.product_name,
    quantity: request.quantity,
    qualityPreference: request.quality_preference,
    destination,
    clientName: request.client_name,
    businessName: request.business_name,
    whatsapp: request.whatsapp,
    email: request.email,
  })
  return { ok: true, reference: request.reference }
}

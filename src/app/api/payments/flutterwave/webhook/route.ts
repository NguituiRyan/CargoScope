import { fulfillSourcingPayment } from "@/lib/sourcing/fulfillment"

export const dynamic = "force-dynamic"

export async function POST(request: Request): Promise<Response> {
  const secret = process.env.FLUTTERWAVE_WEBHOOK_HASH
  const signature = request.headers.get("verif-hash")
  if (!secret || !signature || signature !== secret) {
    return new Response("Unauthorized", { status: 401 })
  }
  const payload = (await request.json()) as {
    event?: string
    data?: { id?: number; tx_ref?: string; status?: string }
  }
  if (
    payload.event === "charge.completed" &&
    payload.data?.status === "successful" &&
    payload.data.id
  ) {
    await fulfillSourcingPayment(payload.data.id, payload.data.tx_ref)
  }
  return new Response("ok", { status: 200 })
}

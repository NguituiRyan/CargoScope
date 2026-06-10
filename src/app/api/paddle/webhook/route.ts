import { Environment, Paddle } from "@paddle/paddle-node-sdk"

import { paddleEnvironment, tierForPriceId } from "@/lib/paddle/config"
import { createAdminClient } from "@/lib/supabase/admin"

export const dynamic = "force-dynamic"

interface SubscriptionData {
  id?: string
  status?: string
  customerId?: string
  customData?: Record<string, unknown> | null
  items?: { price?: { id?: string } }[]
}

/**
 * Paddle webhook. Verifies the signature with the Node SDK, then flips the
 * manufacturer's subscription_tier from the subscribed price. Uses the
 * service-role client (the manufacturer is identified by the customData we set
 * at checkout). Always answers 2xx fast so Paddle doesn't retry needlessly.
 */
export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.PADDLE_API_KEY
  const secret = process.env.PADDLE_WEBHOOK_SECRET
  if (!apiKey || !secret) {
    return new Response("Paddle not configured", { status: 503 })
  }

  const signature = request.headers.get("paddle-signature") ?? ""
  const rawBody = await request.text()

  const paddle = new Paddle(apiKey, {
    environment:
      paddleEnvironment === "production"
        ? Environment.production
        : Environment.sandbox,
  })

  let event
  try {
    event = await paddle.webhooks.unmarshal(rawBody, secret, signature)
  } catch {
    return new Response("Invalid signature", { status: 400 })
  }
  if (!event) return new Response("ok", { status: 200 })

  if (String(event.eventType).startsWith("subscription.")) {
    const d = event.data as unknown as SubscriptionData
    const manufacturerId =
      typeof d.customData?.manufacturerId === "string"
        ? d.customData.manufacturerId
        : null
    const subscriptionId = d.id ?? null
    const customerId = d.customerId ?? null
    const status = d.status ?? null
    const priceId = d.items?.find((i) => i.price?.id)?.price?.id
    const active = status === "active" || status === "trialing"
    const tier = active ? (tierForPriceId(priceId) ?? "none") : "none"

    const admin = createAdminClient()
    if (manufacturerId) {
      await admin
        .from("manufacturers")
        .update({
          subscription_tier: tier,
          subscription_status: status,
          paddle_subscription_id: subscriptionId,
          paddle_customer_id: customerId,
        })
        .eq("id", manufacturerId)
    } else if (subscriptionId) {
      await admin
        .from("manufacturers")
        .update({ subscription_tier: tier, subscription_status: status })
        .eq("paddle_subscription_id", subscriptionId)
    }
  }

  return new Response("ok", { status: 200 })
}

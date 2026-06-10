"use client"

import { useEffect, useRef, useState } from "react"
import { initializePaddle, type Paddle } from "@paddle/paddle-js"

import { Button } from "@/components/ui/button"

/**
 * Opens the Paddle overlay checkout for a supplier subscription. The
 * manufacturer id rides along as customData so the webhook can flip their tier.
 */
export function SubscribeButton({
  priceId,
  manufacturerId,
  email,
  label,
  variant = "default",
}: {
  priceId: string
  manufacturerId: string
  email: string
  label: string
  variant?: "default" | "outline"
}) {
  const paddleRef = useRef<Paddle | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!token) return
    let active = true
    initializePaddle({
      environment:
        process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
          ? "production"
          : "sandbox",
      token,
    })
      .then((paddle) => {
        if (active && paddle) {
          paddleRef.current = paddle
          setReady(true)
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])

  function openCheckout() {
    paddleRef.current?.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: { email },
      customData: { manufacturerId },
      settings: {
        displayMode: "overlay",
        successUrl: `${window.location.origin}/seller`,
      },
    })
  }

  return (
    <Button type="button" variant={variant} onClick={openCheckout} disabled={!ready}>
      {label}
    </Button>
  )
}

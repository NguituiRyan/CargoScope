"use client"

import { useFormStatus } from "react-dom"
import { Loader2, MessageSquare } from "lucide-react"

import { Button } from "@/components/ui/button"

/**
 * Submit button for the start-conversation form. Lives in its own client
 * component so it can surface pending state via useFormStatus while the
 * surrounding form (and its server action) stay server-rendered.
 */
export function ContactSupplierButton({
  label,
  size = "lg",
}: {
  label: string
  size?: "default" | "sm" | "lg"
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size={size} disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <MessageSquare className="size-4" aria-hidden />
      )}
      {label}
    </Button>
  )
}

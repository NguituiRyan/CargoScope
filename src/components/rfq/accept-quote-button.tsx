"use client"

import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Check, Loader2 } from "lucide-react"

import { acceptQuoteAction, type RfqActionState } from "@/lib/rfq/actions"
import { Button } from "@/components/ui/button"

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Check className="size-4" aria-hidden />
      )}
      {label}
    </Button>
  )
}

export function AcceptQuoteButton({
  rfqId,
  quoteId,
  label,
}: {
  rfqId: string
  quoteId: string
  label: string
}) {
  const [state, formAction] = useActionState<RfqActionState, FormData>(
    acceptQuoteAction,
    {}
  )
  return (
    <form action={formAction} className="flex flex-col items-start gap-2">
      <input type="hidden" name="rfqId" value={rfqId} />
      <input type="hidden" name="quoteId" value={quoteId} />
      <Submit label={label} />
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}

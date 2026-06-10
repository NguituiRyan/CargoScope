"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"

import type { AiTextResult } from "@/lib/ai/actions"
import { Button } from "@/components/ui/button"

/**
 * "Draft with AI" helper. The parent supplies `onGenerate` (gathers form input
 * and calls a server action) and `onResult` (writes the text into the field).
 * Errors are non-blocking — the user can always type manually.
 */
export function AiDraftButton({
  label,
  errorLabel,
  onGenerate,
  onResult,
}: {
  label: string
  errorLabel: string
  onGenerate: () => Promise<AiTextResult>
  onResult: (text: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true)
          setFailed(false)
          try {
            const result = await onGenerate()
            if (result.text) onResult(result.text)
            else setFailed(true)
          } catch {
            setFailed(true)
          } finally {
            setBusy(false)
          }
        }}
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="size-4" aria-hidden />
        )}
        {label}
      </Button>
      {failed ? <p className="text-xs text-destructive">{errorLabel}</p> : null}
    </div>
  )
}

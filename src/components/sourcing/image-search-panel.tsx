"use client"

import { useActionState, useRef, useState } from "react"
import { Camera, ImagePlus, Loader2, UploadCloud } from "lucide-react"

import { Button } from "@/components/ui/button"
import { createImageSearchAction } from "@/lib/sourcing/actions"
import { compressProductImages } from "@/lib/images/compress"
import { getVisitorId, trackBusinessEvent } from "@/lib/analytics/client"
import { TurnstileWidget } from "@/components/security/turnstile-widget"
import { uploadSourcingFiles } from "@/lib/sourcing/upload-client"

export function ImageSearchPanel({ noResults = false }: { noResults?: boolean }) {
  const [state, action, pending] = useActionState(async (previous: { error?: string }, formData: FormData) => {
    try {
      const file = formData.get("image")
      if (file instanceof File && file.size > 0) {
        const uploaded = await uploadSourcingFiles([file])
        formData.delete("image")
        formData.set("preUploadedAttachments", JSON.stringify(uploaded))
      }
      return await createImageSearchAction(previous, formData)
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Upload failed. Please try again." }
    }
  }, {})
  const [fileName, setFileName] = useState("")
  const [startedAt] = useState(() => Date.now())
  const inputRef = useRef<HTMLInputElement>(null)
  const [sourcePath] = useState(() => typeof window === "undefined" ? "" : window.location.pathname)
  const [visitorId] = useState(() => typeof window === "undefined" ? "" : getVisitorId())

  async function prepareFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0]
    if (!file) return
    trackBusinessEvent("image_search_started", { fileType: file.type })
    const [compressed] = await compressProductImages([file])
    if (compressed && inputRef.current && typeof DataTransfer !== "undefined") {
      const transfer = new DataTransfer()
      transfer.items.add(compressed)
      inputRef.current.files = transfer.files
      setFileName(compressed.name)
    } else {
      setFileName(file.name)
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-5">
      <div className="brand-gradient-02 overflow-hidden rounded-2xl p-[1px] shadow-lg">
        <div className="grid gap-5 rounded-[calc(var(--radius-2xl)-1px)] bg-foreground px-5 py-6 text-background sm:px-7 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Camera className="size-6" aria-hidden />
            </span>
            <div>
              <p className="text-xs font-bold tracking-[0.18em] text-[#ffd166] uppercase">
                Product image search
              </p>
              <h2 className="mt-1 font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                CAN&apos;T FIND IT? SEND US A PHOTO.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-background/75 sm:text-base">
                No product name or SKU needed. Upload a clear photo and continue straight to a ShopBuddy sourcing request.
              </p>
            </div>
          </div>
          <form action={action} className="flex min-w-0 flex-col gap-2 md:w-72">
            <input type="hidden" name="website" value="" />
            <input type="hidden" name="formStartedAt" value={startedAt} />
            <input type="hidden" name="sourcePath" value={sourcePath} />
            <input type="hidden" name="visitorId" value={visitorId} />
            <label className="flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#ffd166] bg-background px-4 text-center text-sm font-bold text-foreground transition hover:bg-[#fff7e0]">
              <ImagePlus className="size-5 text-primary" aria-hidden />
              {fileName || "ATTACH IMAGE TO SEARCH"}
              <input
                ref={inputRef}
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp,image/gif"
                capture="environment"
                required
                className="sr-only"
                onChange={prepareFile}
              />
            </label>
            <Button
              type="submit"
              size="lg"
              disabled={pending || !fileName}
              onClick={() => trackBusinessEvent("image_search_uploaded")}
              className="h-11 w-full font-bold"
            >
              {pending ? <Loader2 className="animate-spin" aria-hidden /> : <UploadCloud aria-hidden />}
              {pending ? "Uploading…" : noResults ? "Let ShopBuddy Source It" : "Search with photo"}
            </Button>
            {state.error ? <p role="alert" className="text-xs text-red-300">{state.error}</p> : null}
            <TurnstileWidget />
          </form>
        </div>
      </div>
    </section>
  )
}

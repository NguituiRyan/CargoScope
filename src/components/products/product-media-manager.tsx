"use client"

import Image from "next/image"
import { useActionState, useEffect, useRef, useState } from "react"
import { useFormStatus } from "react-dom"
import { Check, Loader2, Trash2, Upload } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  addProductMediaAction,
  deleteProductMediaAction,
  setProductCoverAction,
  type ProductActionState,
} from "@/lib/products/actions"
import type { ProductMediaItem } from "@/lib/products/queries"
import { compressProductImages } from "@/lib/images/compress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function DeleteMediaButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      className="absolute top-1.5 right-1.5 grid size-7 place-items-center rounded-md bg-background/90 text-destructive shadow-sm transition-colors hover:bg-background disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="size-4" aria-hidden />
      )}
    </button>
  )
}

export function ProductMediaManager({
  locale,
  productId,
  media,
  primaryImageUrl,
}: {
  locale: string
  productId: string
  media: ProductMediaItem[]
  primaryImageUrl: string | null
}) {
  const t = useTranslations("product")
  const [state, formAction, isPending] = useActionState<
    ProductActionState,
    FormData
  >(addProductMediaAction, {})
  const [optimizing, setOptimizing] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const busy = optimizing || isPending

  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state.ok])

  // Compress images in the browser before uploading, then dispatch the action
  // with the optimised files. Keeps uploads fast on slow links and avoids
  // server-action payload limits, while display quality stays high.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem("media") as HTMLInputElement | null
    const files = input?.files ? Array.from(input.files) : []
    if (files.length === 0) return
    setOptimizing(true)
    const processed = await compressProductImages(files)
    const fd = new FormData()
    fd.set("locale", locale)
    fd.set("productId", productId)
    for (const file of processed) fd.append("media", file)
    setOptimizing(false)
    formAction(fd)
  }

  return (
    <div className="flex flex-col gap-5">
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="media">{t("media")}</Label>
          <Input
            id="media"
            name="media"
            type="file"
            multiple
            required
            accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
            className="h-auto py-2 file:mr-3 file:rounded-md file:bg-secondary file:px-2.5 file:py-1 file:text-secondary-foreground"
          />
          <p className="text-xs text-muted-foreground">{t("mediaHint")}</p>
        </div>

        {state.error ? (
          <p role="alert" className="text-sm text-destructive">
            {state.error}
          </p>
        ) : null}
        {state.ok && !busy ? (
          <p
            role="status"
            className="flex items-center gap-1.5 text-sm text-verified-foreground"
          >
            <Check className="size-4" aria-hidden />
            {t("mediaAdded")}
          </p>
        ) : null}

        <Button type="submit" disabled={busy} className="h-10">
          {busy ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              {optimizing ? t("optimizing") : t("uploading")}
            </>
          ) : (
            <>
              <Upload className="size-4" aria-hidden />
              {t("addMedia")}
            </>
          )}
        </Button>
      </form>

      {media.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noMedia")}</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((item) => (
            <li
              key={item.id}
              className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
            >
              {item.type === "video" ? (
                <video
                  src={item.url}
                  controls
                  className="size-full object-cover"
                />
              ) : (
                <Image
                  src={item.url}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 50vw, 33vw"
                  className="object-cover"
                />
              )}
              {item.type === "image" && item.url === primaryImageUrl ? (
                <Badge
                  variant="default"
                  className="absolute bottom-1.5 left-1.5"
                >
                  {t("primary")}
                </Badge>
              ) : item.type === "image" ? (
                <form action={setProductCoverAction}>
                  <input type="hidden" name="productId" value={productId} />
                  <input type="hidden" name="mediaUrl" value={item.url} />
                  <button
                    type="submit"
                    className="absolute bottom-1.5 left-1.5 rounded-md bg-black/60 px-2 py-1 text-[10px] font-semibold text-white backdrop-blur-sm transition-colors hover:bg-black/85"
                  >
                    {t("setAsCover")}
                  </button>
                </form>
              ) : null}
              <form action={deleteProductMediaAction}>
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="productId" value={productId} />
                <input type="hidden" name="mediaId" value={item.id} />
                <DeleteMediaButton label={t("deleteMedia")} />
              </form>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

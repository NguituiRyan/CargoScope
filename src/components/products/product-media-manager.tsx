"use client"

import Image from "next/image"
import { useActionState, useEffect, useRef } from "react"
import { useFormStatus } from "react-dom"
import { Check, Loader2, Trash2, Upload } from "lucide-react"
import { useTranslations } from "next-intl"

import {
  addProductMediaAction,
  deleteProductMediaAction,
  type ProductActionState,
} from "@/lib/products/actions"
import type { ProductMediaItem } from "@/lib/products/queries"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function UploadButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="h-10">
      {pending ? (
        <>
          <Loader2 className="animate-spin" aria-hidden />
          {busy}
        </>
      ) : (
        <>
          <Upload className="size-4" aria-hidden />
          {idle}
        </>
      )}
    </Button>
  )
}

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
  const [state, formAction] = useActionState<ProductActionState, FormData>(
    addProductMediaAction,
    {}
  )
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.ok) formRef.current?.reset()
  }, [state.ok])

  return (
    <div className="flex flex-col gap-5">
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="productId" value={productId} />
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
        {state.ok ? (
          <p
            role="status"
            className="flex items-center gap-1.5 text-sm text-verified-foreground"
          >
            <Check className="size-4" aria-hidden />
            {t("mediaAdded")}
          </p>
        ) : null}

        <UploadButton idle={t("addMedia")} busy={t("uploading")} />
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

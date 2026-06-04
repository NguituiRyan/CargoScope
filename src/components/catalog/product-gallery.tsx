"use client"

import { useState } from "react"
import Image from "next/image"
import { Package } from "lucide-react"

import { cn } from "@/lib/utils"
import type { PublicMediaItem } from "@/lib/catalog/queries"

type GalleryItem = Pick<PublicMediaItem, "id" | "type" | "url">

export function ProductGallery({
  media,
  primaryImageUrl,
  title,
}: {
  media: PublicMediaItem[]
  primaryImageUrl: string | null
  title: string
}) {
  const items: GalleryItem[] =
    media.length > 0
      ? media
      : primaryImageUrl
        ? [{ id: "primary", type: "image", url: primaryImageUrl }]
        : []

  const [active, setActive] = useState(0)
  const current = items[active]

  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
        {!current ? (
          <Package
            className="absolute inset-0 m-auto size-12 text-muted-foreground"
            aria-hidden
          />
        ) : current.type === "video" ? (
          <video
            src={current.url}
            controls
            className="size-full object-contain"
          />
        ) : (
          <Image
            src={current.url}
            alt={title}
            fill
            unoptimized
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="object-cover"
          />
        )}
      </div>

      {items.length > 1 && (
        <ul className="grid grid-cols-5 gap-2">
          {items.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`${title} ${index + 1}`}
                aria-current={index === active}
                className={cn(
                  "relative aspect-square w-full overflow-hidden rounded-md border bg-muted transition-colors",
                  index === active
                    ? "border-ring ring-2 ring-ring/40"
                    : "border-border hover:border-ring"
                )}
              >
                {item.type === "video" ? (
                  <video src={item.url} className="size-full object-cover" />
                ) : (
                  <Image
                    src={item.url}
                    alt=""
                    fill
                    unoptimized
                    sizes="20vw"
                    className="object-cover"
                  />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

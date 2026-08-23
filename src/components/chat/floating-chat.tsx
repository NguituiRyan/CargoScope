"use client"

import { useEffect, useRef, useState } from "react"
import { MessageCircle, X } from "lucide-react"

import { LogoMark } from "@/components/brand/logo-mark"
import { TrackedExternalLink } from "@/components/analytics/tracked-external-link"

const WHATSAPP_URL =
  "https://wa.me/8619550539767?text=Hello%20Shopbuddy%2C%20I%27m%20interested%20in%20sourcing%20products%20from%20China."

/**
 * Floating WhatsApp launcher, mounted in the locale layout so a buyer can reach
 * a human from any page. Wears the Shopbuddy mark rather than a WhatsApp glyph —
 * the tap is on our brand, the destination is WhatsApp.
 */
export function FloatingChat() {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  // Escape + outside-press close, same behaviour as the mobile nav.
  useEffect(() => {
    if (!open) return
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("pointerdown", onPointerDown)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("pointerdown", onPointerDown)
    }
  }, [open])

  return (
    <div
      ref={rootRef}
      className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-3 print:hidden sm:right-6 sm:bottom-6"
    >
      {open ? (
        <div
          id="floating-chat-panel"
          role="dialog"
          aria-label="Chat with Shopbuddy"
          className="w-[min(18rem,calc(100vw-2rem))] rounded-2xl border border-border bg-card p-4 shadow-xl"
        >
          <div className="flex items-start gap-2.5">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-emerald-600 text-white">
              <LogoMark className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Chat with Shopbuddy</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                We usually reply within minutes.
              </p>
            </div>
            <button
              type="button"
              aria-label="Close chat"
              onClick={() => setOpen(false)}
              className="-mt-1 -mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          <TrackedExternalLink
            href={WHATSAPP_URL}
            event="whatsapp_click"
            metadata={{ placement: "floating" }}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-3.5 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <MessageCircle className="size-4 shrink-0" aria-hidden />
            Chat on WhatsApp
          </TrackedExternalLink>
        </div>
      ) : null}

      <button
        type="button"
        aria-label={open ? "Close chat" : "Chat with Shopbuddy on WhatsApp"}
        aria-expanded={open}
        aria-controls="floating-chat-panel"
        onClick={() => setOpen((value) => !value)}
        className="grid size-12 place-items-center rounded-full bg-emerald-600 text-white shadow-lg transition-colors outline-none hover:bg-emerald-700 focus-visible:ring-3 focus-visible:ring-emerald-600/50 sm:size-14"
      >
        {open ? (
          <X className="size-6" aria-hidden />
        ) : (
          <LogoMark className="size-6.5 sm:size-7" />
        )}
      </button>
    </div>
  )
}

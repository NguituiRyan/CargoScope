"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import { useLocale } from "next-intl"

import { Flag, type FlagCode } from "@/components/brand/flags"
import { Link, usePathname } from "@/i18n/navigation"
import { locales, type Locale } from "@/i18n/routing"
import { cn } from "@/lib/utils"

const LOCALES: Record<Locale, { flag: FlagCode; name: string }> = {
  en: { flag: "gb", name: "English" },
  sw: { flag: "ke", name: "Kiswahili" },
  zh: { flag: "cn", name: "中文" },
}

export function LocaleSwitcher() {
  const pathname = usePathname()
  const active = useLocale() as Locale
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const current = LOCALES[active] ?? LOCALES.en

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Language"
        className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-1.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
      >
        <Flag code={current.flag} className="h-3.5 w-5" />
        <ChevronDown className="size-3.5" aria-hidden />
      </button>

      {open ? (
        <div
          role="listbox"
          className="absolute right-0 z-50 mt-1 w-40 overflow-hidden rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {locales.map((loc) => {
            const item = LOCALES[loc]
            return (
              <Link
                key={loc}
                href={pathname}
                locale={loc}
                onClick={() => setOpen(false)}
                aria-current={loc === active ? "true" : undefined}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted",
                  loc === active
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Flag code={item.flag} className="h-3.5 w-5" />
                {item.name}
              </Link>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { useTranslations } from "next-intl"

import { Input } from "@/components/ui/input"

/** Password field with a show/hide toggle so users can check what they typed. */
export function PasswordInput({
  id,
  name,
  autoComplete,
  required,
  minLength,
}: {
  id: string
  name: string
  autoComplete: string
  required?: boolean
  minLength?: number
}) {
  const t = useTranslations("auth")
  const [show, setShow] = useState(false)
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? t("hidePassword") : t("showPassword")}
        aria-pressed={show}
        className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md text-muted-foreground transition-colors hover:text-foreground"
      >
        {show ? (
          <EyeOff className="size-4" aria-hidden />
        ) : (
          <Eye className="size-4" aria-hidden />
        )}
      </button>
    </div>
  )
}
